export function formatPhone(phone: string): string {
  // Convertit 06XXXXXXXX en 2126XXXXXXXX (format international Maroc)
  if (!phone) return ''
  const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '')
  if (cleaned.startsWith('212')) return cleaned
  if (cleaned.startsWith('0')) return '212' + cleaned.slice(1)
  return '212' + cleaned
}

export function whatsappLink(phone: string, message: string): string {
  const formattedPhone = formatPhone(phone)
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

export const MESSAGES = {
  absence: (studentName: string, date: string, schoolName: string) =>
    `Bonjour,\n\nNous vous informons que votre enfant *${studentName}* a été absent(e) ce ${date}.\n\nMerci de nous contacter si vous avez une justification.\n\nCordialement,\n*${schoolName}*`,

  absenсeJustified: (studentName: string, date: string, schoolName: string) =>
    `Bonjour,\n\nL'absence de votre enfant *${studentName}* du ${date} a bien été enregistrée comme justifiée.\n\nCordialement,\n*${schoolName}*`,

  paymentLate: (studentName: string, amount: number, dueDate: string, schoolName: string) =>
    `Bonjour,\n\nNous vous rappelons qu'un paiement de *${amount} MAD* pour la scolarité de *${studentName}* est en retard depuis le ${dueDate}.\n\nMerci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\n*${schoolName}*`,

  paymentReminder: (studentName: string, amount: number, dueDate: string, schoolName: string) =>
    `Bonjour,\n\nCeci est un rappel amical : un paiement de *${amount} MAD* pour *${studentName}* est attendu le ${dueDate}.\n\nCordialement,\n*${schoolName}*`,

  observation: (studentName: string, weekStart: string, effort: number, performance: number, comment: string, schoolName: string) =>
    `Bonjour,\n\nVoici l'observation hebdomadaire de votre enfant *${studentName}* (semaine du ${weekStart}) :\n\n⭐ Effort : ${effort}/5\n📊 Performance : ${performance}/5\n\n💬 _"${comment}"_\n\nCordialement,\n*${schoolName}*`,

  announcement: (title: string, content: string, schoolName: string) =>
    `📢 *${schoolName}*\n\n*${title}*\n\n${content}\n\nCordialement,\n*${schoolName}*`,
}