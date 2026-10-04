import { replaceMessageVariables } from './communications';
import { ChurchEvent, MemberRecord } from '../types';

export interface WelcomeGenParams {
  memberName: string;
  churchName: string;
  ministry: string;
  notes?: string;
  tone?: 'warm_pastoral' | 'vibrant_youth' | 'gentle_encouraging' | 'reverent_faith';
}

export interface BroadcastGenParams {
  event: ChurchEvent;
  churchName: string;
  targetAudience?: string;
  tone?: 'urgent_inspiring' | 'high_energy_worship' | 'reverent_prayer' | 'family_warm';
  customNote?: string;
}

export async function generateAiWelcomeMessage(params: WelcomeGenParams): Promise<string> {
  const systemInstruction = `You are a warm, welcoming church pastor and ministry coordinator. 
Your goal is to write a personalized, uplifting SMS welcome message to a person who registered for church ministry.
Rules:
- Keep it under 260 characters so it fits cleanly in SMS.
- Include the person's name and church name naturally.
- Acknowledge their interest in the specific ministry (${params.ministry || 'our church family'}).
- Add a warm blessing or short verse snippet (e.g., Psalm 133:1 or Romans 15:7).
- Keep it friendly, genuine, and not spammy.
- Do NOT include placeholders like [Your Name]; sign off as the Pastoral Team.`;

  const prompt = `Write a personalized welcome SMS text for:
Name: ${params.memberName}
Church: ${params.churchName}
Ministry / Department: ${params.ministry}
Tone: ${params.tone || 'warm_pastoral'}
Additional Context: ${params.notes || 'Recently registered for fellowship'}`;

  try {
    const res = await fetch('/api/generate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return data.text.trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    console.warn('AI generation unavailable, using curated template:', err);
  }

  // Curated pastoral fallback
  const firstName = params.memberName.split(' ')[0] || 'Friend';
  return `Hi ${firstName}! Welcome to ${params.churchName}. We are so blessed to have you connect with our ${params.ministry} ministry! "Accept one another as Christ accepted you" (Rom 15:7). We look forward to seeing you soon! - Pastoral Team`;
}

export async function generateAiBroadcastMessage(params: BroadcastGenParams): Promise<string> {
  const systemInstruction = `You are a church communications director crafting an engaging SMS broadcast for church members about an upcoming worship night or ministry program.
Rules:
- SMS friendly, concise (under 280 characters).
- Include {First_Name} placeholder for dynamic recipient personalization.
- Highlight Event Title, Date, Time, and Location.
- Include a high-energy or inspiring call to action (bring a friend, expectant hearts).
- Do NOT use hashtags or markdown formatting.`;

  const prompt = `Create a broadcast SMS text for this church event:
Event: ${params.event.title}
Date & Time: ${params.event.date} at ${params.event.time}
Location: ${params.event.location}
Theme/Description: ${params.event.description}
Scripture: ${params.event.scripture || ''}
Target Group: ${params.targetAudience || 'All Church Members'}
Tone: ${params.tone || 'high_energy_worship'}`;

  try {
    const res = await fetch('/api/generate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return data.text.trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    console.warn('AI broadcast generation fallback triggered:', err);
  }

  // Curated broadcast fallback
  return `Hi {First_Name}! Join us for ${params.event.title} this ${params.event.date} at ${params.event.time} at ${params.event.location}. ${params.event.description} Come expectant and bring a friend! - ${params.churchName}`;
}
