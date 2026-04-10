'use client'
import { createClient } from '@supabase/supabase-js'

const url = 'https://daxyatiesxdxznrjdxxm.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRheHlhdGllc3hkeHpucmpkeHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTc0OTAsImV4cCI6MjA5MTM5MzQ5MH0.obkIbzDxZmT5a7vVxC9IXVMIlK0f9nxzlHur1v8rEqQ'

export const supabase = createClient(url, key)
