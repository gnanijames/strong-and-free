// Bilingual WhatsApp messages — English first, Tamil below the divider.

export function waClassReminder24hr({ name, dayTime, meetLink }) {
  return [
    `Hi ${name}! Your Strong and Free class is tomorrow — ${dayTime}.`,
    ``,
    `Join here: ${meetLink}`,
    ``,
    `—`,
    `வணக்கம் ${name}! உங்கள் வகுப்பு நாளை — ${dayTime}.`,
    ``,
    `இணைவதற்கு: ${meetLink}`,
  ].join('\n');
}

export function waClassReminderMorning({ name, dayTime, meetLink }) {
  return [
    `Hi ${name}! Strong and Free class starts in 1 hour — ${dayTime}.`,
    ``,
    `Join now: ${meetLink}`,
    ``,
    `—`,
    `வணக்கம் ${name}! வகுப்பு 1 மணி நேரத்தில் தொடங்கும் — ${dayTime}.`,
    ``,
    `இப்போது இணையுங்கள்: ${meetLink}`,
  ].join('\n');
}

export function waWelcome({ name, meetLink }) {
  return [
    `Welcome to Strong and Free, ${name}! 🎉`,
    ``,
    `Classes run Mon, Wed, or Fri at 10:00 AM ET. You'll get a WhatsApp reminder before each class.`,
    ``,
    `Your class link: ${meetLink}`,
    ``,
    `Questions? Reply here any time.`,
    ``,
    `—`,
    `Strong and Free-க்கு வரவேற்கிறோம், ${name}! 🎉`,
    ``,
    `வகுப்புகள் திங்கள், புதன் அல்லது வெள்ளி காலை 10:00 ET. ஒவ்வொரு வகுப்பிற்கும் முன் WhatsApp நினைவூட்டல் வரும்.`,
    ``,
    `உங்கள் வகுப்பு இணைப்பு: ${meetLink}`,
  ].join('\n');
}
