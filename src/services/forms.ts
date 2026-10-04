import { GoogleFormInfo, GoogleFormQuestion, GoogleFormResponse, MemberRecord } from '../types';
import { cleanPhoneNumber } from './sheets';

export async function listFormsFromDrive(
  accessToken: string
): Promise<{ id: string; name: string; modifiedTime?: string }[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=30&fields=files(id,name,modifiedTime)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API error listing forms (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
  }));
}

export async function getFormDetails(
  accessToken: string,
  formId: string
): Promise<GoogleFormInfo> {
  const url = `https://forms.googleapis.com/v1/forms/${formId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Forms API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const questions: GoogleFormQuestion[] = [];

  (data.items || []).forEach((item: any) => {
    if (item.questionItem?.question) {
      const q = item.questionItem.question;
      let type = 'TEXT';
      if (q.choiceQuestion) type = 'CHOICE';
      if (q.scaleQuestion) type = 'SCALE';
      if (q.dateQuestion) type = 'DATE';

      questions.push({
        questionId: q.questionId,
        title: item.title || 'Untitled Question',
        type,
        required: q.required,
      });
    } else if (item.questionGroupItem?.questions) {
      item.questionGroupItem.questions.forEach((q: any) => {
        questions.push({
          questionId: q.questionId,
          title: item.title || 'Untitled Question Group',
          type: 'TEXT',
          required: q.required,
        });
      });
    }
  });

  return {
    formId: data.formId,
    title: data.info?.title || data.info?.documentTitle || 'Untitled Church Form',
    description: data.info?.description,
    responderUri: data.responderUri,
    linkedSheetId: data.linkedSheetId,
    questions,
  };
}

export async function getFormResponses(
  accessToken: string,
  formId: string,
  questions: GoogleFormQuestion[]
): Promise<GoogleFormResponse[]> {
  const url = `https://forms.googleapis.com/v1/forms/${formId}/responses`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch form responses (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawResponses: any[] = data.responses || [];

  // Identify questions based on title keywords
  let nameQId = '';
  let phoneQId = '';
  let ministryQId = '';
  let notesQId = '';

  questions.forEach(q => {
    const t = q.title.toLowerCase();
    if (/(name|attendee|person|who|full name|first name)/i.test(t) && !nameQId) {
      nameQId = q.questionId;
    } else if (/(phone|mobile|cell|number|contact|tel)/i.test(t) && !phoneQId) {
      phoneQId = q.questionId;
    } else if (/(ministry|dept|department|area|team|group|interest)/i.test(t) && !ministryQId) {
      ministryQId = q.questionId;
    } else if (/(note|prayer|request|comment|remark)/i.test(t) && !notesQId) {
      notesQId = q.questionId;
    }
  });

  // Fallbacks if not matched
  if (!nameQId && questions[0]) nameQId = questions[0].questionId;
  if (!phoneQId && questions[1]) phoneQId = questions[1].questionId;
  if (!ministryQId && questions[2]) ministryQId = questions[2].questionId;

  return rawResponses.map(r => {
    const answersMap: Record<string, string[]> = {};
    if (r.answers) {
      Object.entries(r.answers).forEach(([qId, ansObj]: [string, any]) => {
        const textValues = (ansObj.textAnswers?.answers || []).map((a: any) => a.value || '');
        answersMap[qId] = textValues;
      });
    }

    const extractedName = (answersMap[nameQId] || [])[0] || 'Form Respondent';
    const extractedPhone = (answersMap[phoneQId] || [])[0] || '';
    const extractedMinistry = (answersMap[ministryQId] || [])[0] || 'General Ministry';
    const extractedNotes = (answersMap[notesQId] || [])[0] || '';

    return {
      responseId: r.responseId,
      createTime: r.createTime,
      lastSubmittedTime: r.lastSubmittedTime,
      answers: answersMap,
      extractedName: extractedName.trim(),
      extractedPhone: extractedPhone.trim(),
      extractedMinistry: extractedMinistry.trim(),
      extractedNotes: extractedNotes.trim(),
    };
  });
}

/**
 * Creates a complete Church Ministry Registration Google Form in Google Drive
 */
export async function createMinistryGoogleForm(
  accessToken: string,
  formTitle: string,
  churchName: string
): Promise<{ formId: string; responderUri: string }> {
  // Step 1: Create empty form
  const createUrl = 'https://forms.googleapis.com/v1/forms';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: formTitle || `${churchName} - Ministry & Worship Registration`,
        documentTitle: formTitle || `${churchName} Ministry Registration`,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Form (${createRes.status}): ${errText}`);
  }

  const createdForm = await createRes.json();
  const formId = createdForm.formId;

  // Step 2: BatchUpdate with items/questions
  const updateUrl = `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`;
  const batchPayload = {
    includeFormInResponse: true,
    requests: [
      {
        createItem: {
          item: {
            title: 'Full Name',
            description: 'Please enter your full name.',
            questionItem: {
              question: {
                required: true,
                textQuestion: {
                  paragraph: false,
                },
              },
            },
          },
          location: { index: 0 },
        },
      },
      {
        createItem: {
          item: {
            title: 'Phone Number',
            description: 'Your mobile number for pastoral welcome messages and worship updates.',
            questionItem: {
              question: {
                required: true,
                textQuestion: {
                  paragraph: false,
                },
              },
            },
          },
          location: { index: 1 },
        },
      },
      {
        createItem: {
          item: {
            title: 'Ministry / Department Interest',
            description: 'Which ministry or area of church life would you like to connect with?',
            questionItem: {
              question: {
                required: true,
                choiceQuestion: {
                  type: 'DROP_DOWN',
                  options: [
                    { value: 'Worship & Creative Arts' },
                    { value: 'Youth & Young Adults' },
                    { value: 'Children of Grace (Kids)' },
                    { value: 'Community Outreach & Compassion' },
                    { value: 'Intercessory Prayer Team' },
                    { value: 'Hospitality & Ushers' },
                    { value: 'First-Time Visitors' },
                    { value: 'General Church Fellowship' },
                  ],
                },
              },
            },
          },
          location: { index: 2 },
        },
      },
      {
        createItem: {
          item: {
            title: 'Are you a First-Time Visitor or Regular Member?',
            questionItem: {
              question: {
                choiceQuestion: {
                  type: 'RADIO',
                  options: [
                    { value: 'First-Time Visitor' },
                    { value: 'Returning Guest' },
                    { value: 'Regular Member' },
                  ],
                },
              },
            },
          },
          location: { index: 3 },
        },
      },
      {
        createItem: {
          item: {
            title: 'Notes, Questions, or Prayer Requests',
            description: 'How can our pastoral team pray for or support you this week?',
            questionItem: {
              question: {
                textQuestion: {
                  paragraph: true,
                },
              },
            },
          },
          location: { index: 4 },
        },
      },
    ],
  };

  const updateRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batchPayload),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.warn('BatchUpdate on form had warning:', errText);
  }

  // Get final responder URI
  const finalForm = await getFormDetails(accessToken, formId);
  return {
    formId,
    responderUri: finalForm.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
  };
}
