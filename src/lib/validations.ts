import { z } from 'zod'

export const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
})

export const LeadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(['new', 'contacted', 'interested', 'converted']).default('new'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: z.string().optional(),
  followUpDate: z.date().optional()
})

export const NoteSchema = z.object({
  text: z.string().min(1),
  leadId: z.string()
})

export type LoginInput = z.infer<typeof LoginSchema>
export type LeadInput = z.infer<typeof LeadSchema>
export type NoteInput = z.infer<typeof NoteSchema>