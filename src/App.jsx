import { useEffect, useMemo, useState } from 'react'
import Spline from '@splinetool/react-spline'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-white/70 hover:bg-white text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}

function AddHabitModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [freq, setFreq] = useState(5)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Add Habit</h3>
        <div className="space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Habit name" className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description" className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Days/week</label>
            <input type="number" min={1} max={7} value={freq} onChange={e=>setFreq(+e.target.value)} className="w-20 rounded-md border px-3 py-2"/>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={()=>onCreate({name, description: desc, target_days_per_week: freq})} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Create</button>
        </div>
      </div>
    </div>
  )
}

function Roadmap({ habitId }){
  const [items,setItems]=useState([])
  useEffect(()=>{ if(!habitId) return; fetch(`${API_BASE}/api/habits/${habitId}/roadmap`).then(r=>r.json()).then(setItems) },[habitId])
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map(it=> (
        <div key={it.id} className="rounded-xl border p-4 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{it.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${it.completed?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{it.completed? 'Done':'Pending'}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{it.description}</p>
          <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full bg-blue-600`} style={{width: `${(it.completed?100:it.order*20)}%`}}/>
          </div>
        </div>
      ))}
    </div>
  )
}

function Resources({ habitId }){
  const [items,setItems]=useState([])
  useEffect(()=>{ if(!habitId) return; fetch(`${API_BASE}/api/habits/${habitId}/resources`).then(r=>r.json()).then(setItems) },[habitId])
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map(r=> (
        <a key={r.id} href={r.url} target="_blank" className="rounded-xl border p-4 bg-white/80 backdrop-blur hover:shadow">
          <div className="text-xs text-blue-600 uppercase tracking-wider">{r.type}</div>
          <div className="font-semibold">{r.title}</div>
          <div className="text-sm text-gray-600">{r.provider}</div>
        </a>
      ))}
    </div>
  )
}

function AskAI({ habitId }){
  const [messages,setMessages]=useState([])
  const [input,setInput]=useState('')
  const [file, setFile] = useState(null)

  async function send(){
    let image_base64 = null
    if(file){
      const buf = await file.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      const mime = file.type || 'image/png'
      image_base64 = `data:${mime};base64,${b64}`
    }
    const res = await fetch(`${API_BASE}/api/ask`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({habit_id: habitId, question: input, image_base64})
    })
    const data = await res.json()
    setMessages(m=>[...m, {role:'user', content: input, image_base64}, {role:'assistant', content: data.answer}])
    setInput(''); setFile(null)
  }

  return (
    <div className="space-y-3">
      <div className="h-64 overflow-auto rounded-xl border bg-white/70 p-3">
        {messages.map((m,i)=>(
          <div key={i} className={`my-2 flex ${m.role==='assistant'?'justify-start':'justify-end'}`}>
            <div className={`${m.role==='assistant'?'bg-blue-50 text-blue-900':'bg-gray-900 text-white'} max-w-[80%] rounded-2xl px-3 py-2`}>
              {m.image_base64 && <img src={m.image_base64} alt="uploaded" className="mb-2 rounded"/>}
              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a question..." className="flex-1 rounded-full border px-4 py-2"/>
        <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button onClick={send} className="rounded-full bg-blue-600 text-white px-4 py-2">Send</button>
      </div>
    </div>
  )
}

function ProgressTracker({ habitId }){
  const [items,setItems]=useState([])
  const [streak,setStreak]=useState(0)
  const [file,setFile]=useState(null)
  const [note,setNote]=useState('')

  async function refresh(){
    if(!habitId) return
    const res = await fetch(`${API_BASE}/api/progress/${habitId}`)
    const data = await res.json()
    setItems(data.items||[])
    setStreak(data.streak||0)
  }
  useEffect(()=>{ refresh() },[habitId])

  async function add(){
    let image_base64 = null
    if(file){
      const buf = await file.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      const mime = file.type || 'image/png'
      image_base64 = `data:${mime};base64,${b64}`
    }
    await fetch(`${API_BASE}/api/progress`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({habit_id: habitId, note, image_base64})})
    setFile(null); setNote('')
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 36 36" className="h-20 w-20">
            <path className="text-gray-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2a16 16 0 110 32 16 16 0 010-32z"/>
            <path className="text-blue-600" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none"
              d="M18 2 a 16 16 0 0 1 0 32" style={{strokeDasharray:`${Math.min(streak,30)/30*100}, 100`}}/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{streak}d</div>
        </div>
        <div className="text-sm text-gray-600">Streak counts consecutive days with any progress.</div>
      </div>

      <div className="rounded-xl border bg-white/80 p-4 space-y-2">
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note..." className="w-full rounded-md border px-3 py-2"/>
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
          <button onClick={add} className="rounded-md bg-blue-600 text-white px-4 py-2">Add Progress</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((p,i)=> (
          <div key={i} className="rounded-xl border bg-white/70 p-2">
            {p.image_base64 && <img src={p.image_base64} className="w-full h-32 object-cover rounded-lg"/>}
            {p.note && <div className="text-xs text-gray-700 mt-2">{p.note}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App(){
  const [tab, setTab] = useState('Dashboard')
  const [habits, setHabits] = useState([])
  const [activeHabit, setActiveHabit] = useState(null)
  const [openAdd, setOpenAdd] = useState(false)

  async function loadHabits(){
    const res = await fetch(`${API_BASE}/api/habits`)
    const data = await res.json()
    setHabits(data)
    if(!activeHabit && data[0]) setActiveHabit(data[0].id)
  }

  useEffect(()=>{ loadHabits() },[])

  async function createHabit(payload){
    const res = await fetch(`${API_BASE}/api/habits`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
    await res.json(); setOpenAdd(false); loadHabits()
  }

  const tabs = ['Dashboard','Roadmap','Resources','Ask AI','Progress Tracker']

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      <div className="relative h-[320px]">
        <Spline scene="https://prod.spline.design/qQUip0dJPqrrPryE/scene.splinecode" style={{ width:'100%', height:'100%' }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 to-white" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 drop-shadow-sm">Habit Genius</h1>
          <p className="mt-2 text-gray-700">Turn habits into a clear roadmap with resources, AI guidance, and visual progress.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 -mt-12">
        <div className="rounded-3xl border bg-white/80 backdrop-blur p-4 md:p-6 shadow-xl">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex gap-2">
              {tabs.map(t => <TabButton key={t} label={t} active={tab===t} onClick={()=>setTab(t)} />)}
            </div>
            <div className="flex items-center gap-3">
              <select value={activeHabit||''} onChange={e=>setActiveHabit(e.target.value)} className="rounded-full border px-3 py-2">
                <option value="">Select habit</option>
                {habits.map(h=> <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <button onClick={()=>setOpenAdd(true)} className="rounded-full bg-blue-600 text-white px-4 py-2">Add Habit</button>
            </div>
          </div>

          <div className="mt-6">
            {tab==='Dashboard' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border p-4 bg-white/70">
                  <h3 className="font-semibold mb-2">Your Habits</h3>
                  <ul className="space-y-2">
                    {habits.map(h => (
                      <li key={h.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${activeHabit===h.id?'bg-blue-50 border-blue-200':''}`}>
                        <div>
                          <div className="font-medium">{h.name}</div>
                          <div className="text-xs text-gray-600">{h.description}</div>
                        </div>
                        <button onClick={()=>setActiveHabit(h.id)} className="text-blue-600 text-sm">Open</button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border p-4 bg-white/70">
                  <h3 className="font-semibold mb-2">Quick Tips</h3>
                  <p className="text-sm text-gray-700">Stay consistent. Keep tasks tiny. Track progress visually for motivation.</p>
                </div>
              </div>
            )}
            {tab==='Roadmap' && <Roadmap habitId={activeHabit} />}
            {tab==='Resources' && <Resources habitId={activeHabit} />}
            {tab==='Ask AI' && <AskAI habitId={activeHabit} />}
            {tab==='Progress Tracker' && <ProgressTracker habitId={activeHabit} />}
          </div>
        </div>
      </div>

      <AddHabitModal open={openAdd} onClose={()=>setOpenAdd(false)} onCreate={createHabit} />
    </div>
  )
}
