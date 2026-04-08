import { createClient } from '@supabase/supabase-js'

// เอา URL และ Key ยาวๆ ของคุณมาใส่ในเครื่องหมายคำพูดตรงๆ เลยครับ
const supabaseUrl = 'https://mjdvgxcjxhjgqkmnzcau.supabase.co' 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZHZneGNqeGhqZ3FrbW56Y2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDI1MjYsImV4cCI6MjA5MTIxODUyNn0.wlOXDvjKwb6V178UvcxOLgCejlspSHvRnstd-uC0Wqo' 

export const supabase = createClient(supabaseUrl, supabaseKey)