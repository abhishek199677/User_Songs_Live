"use client";
import { useState, useEffect, useOptimistic, useTransition } from 'react';
import { Mic, Search, FileText, MonitorPlay, Check, Trash2, UploadCloud, FileMusic, Loader2, Edit3, ArrowUp, ArrowDown, Save, X, RotateCcw, User, LogIn, Video, Plus, GripVertical, Monitor, Presentation, Star, MessageSquare, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOTION_THEMES, getTemplateStyle } from '../lib/template-engine';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import * as actions from './actions';

export default function Home() {
  const [userAuth, setUserAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('songs'); 
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [pendingSongs, setPendingSongs] = useState([]);
  const [deletedSongs, setDeletedSongs] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [voiceLang, setVoiceLang] = useState('te-IN');
  const [suggestions, setSuggestions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [projectingSong, setProjectingSong] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('nebula');
  const [mounted, setMounted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [appTheme, setAppTheme] = useState('nebula');

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('appUser');
    if(saved) {
       try { 
         const parsed = JSON.parse(saved);
         if (parsed && parsed.identifier) setUserAuth(parsed); 
       } catch(e) { localStorage.removeItem('appUser'); }
    }
  }, []);

  const fetchEverything = async () => {
    if (!userAuth) return;
    setIsLoading(true);
    try {
      const [appRes, penRes, delRes, usrRes, vidRes, feedRes] = await Promise.all([
        fetch('/api/songs?status=approved').then(r => r.ok ? r.json() : []),
        fetch('/api/songs?status=pending').then(r => r.ok ? r.json() : []),
        fetch('/api/songs?status=deleted').then(r => r.ok ? r.json() : []),
        fetch('/api/admin/users').then(r => r.ok ? r.json() : []),
        fetch('/api/videos').then(r => r.ok ? r.json() : []),
        fetch('/api/feedback').then(r => r.ok ? r.json() : [])
      ]);
      
      setSongs(Array.isArray(appRes) ? appRes : []);
      setPendingSongs(Array.isArray(penRes) ? penRes : []);
      setDeletedSongs(Array.isArray(delRes) ? delRes : []);
      setRegisteredUsers(Array.isArray(usrRes) ? usrRes : []);
      setVideos(Array.isArray(vidRes) ? vidRes : []);
      setFeedbacks(Array.isArray(feedRes) ? feedRes : []);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if(mounted && userAuth) fetchEverything();
  }, [mounted, userAuth, activeTab]);

  if(!mounted) return null;
  if(!userAuth) return <LoginSplash onLogin={setUserAuth} />;

  const isAdmin = userAuth?.role === 'admin' || ['puttapoguabhishek1007@gmail.com', 'admin'].includes(userAuth?.identifier?.toLowerCase());
  const safeTemplateStyle = getTemplateStyle(selectedTheme) || {};
  const activeBgTheme = MOTION_THEMES.find(t => t.id === appTheme) || MOTION_THEMES[0];

  return (
    <>
    <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:-1}}>
       <video key={appTheme} autoPlay loop muted playsInline style={{width:'100%', height:'100%', objectFit:'cover', position:'absolute', top:0, left:0, zIndex:-2, opacity:0.6}}>
         <source src={activeBgTheme.url} type="video/mp4" />
       </video>
       <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:activeBgTheme.overlay, zIndex:-1}}></div>
    </div>
    
    <div className="app-container">
      <AnimatePresence>
        {projectingSong && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="login-overlay" style={{ padding: '2rem', zIndex: 9999 }}>
             <button onClick={() => setProjectingSong(null)} className="btn btn-outline" style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 10001 }}><X /> Close</button>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '1200px' }}>
                <div style={safeTemplateStyle.container}>
                   <video key={selectedTheme} autoPlay loop muted playsInline style={safeTemplateStyle.video}><source src={MOTION_THEMES.find(t => t.id === selectedTheme)?.url} type="video/mp4" /></video>
                   <div style={safeTemplateStyle.overlay}></div>
                   <div style={safeTemplateStyle.content}>{projectingSong.title}</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                   {MOTION_THEMES.map(theme => <button key={theme.id} onClick={() => setSelectedTheme(theme.id)} className={`btn ${selectedTheme === theme.id ? 'btn-primary' : 'btn-outline'}`}>{theme.name}</button>)}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header style={{ marginBottom: '3rem' }}>
        <div className="fancy-header-block" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem'}}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Heavenly <span className="text-primary-color">Harmony</span></h1>
            <p style={{fontSize:'0.8rem', color:'#94a3b8'}}>Praise the Lord, {userAuth?.name || 'User'} ({userAuth?.branch})</p>
          </div>
          <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
             {MOTION_THEMES.map(theme => (
                <button key={theme.id} onClick={() => setAppTheme(theme.id)} className={`btn ${appTheme === theme.id ? 'btn-primary' : 'btn-outline'}`} style={{fontSize:'12px', padding:'4px 8px'}}><Sparkles size={12} style={{marginRight:'3px'}}/> {theme.name}</button>
             ))}
          </div>
        </div>
        <div className="fancy-header-block" style={{marginTop:'1rem', padding:'1rem'}}>
          <nav className="nav-tabs">
            <button className={`nav-tab ${activeTab === 'songs' ? 'active' : ''}`} onClick={() => setActiveTab('songs')}>Lyrics</button>
            <button className={`nav-tab ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>Watch</button>
            <button className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>Upload</button>
            {isAdmin && <button className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin</button>}
            <button onClick={() => setShowFeedback(true)} className="nav-tab"><Star size={16} /> Rate</button>
          </nav>
        </div>
      </header>

      <main>
        {activeTab === 'songs' && (
          <div>
            <div className="controls-bar"><div className="search-container"><Search className="search-icon" size={20} /><input type="text" className="search-input" placeholder="Find a song..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>
            {isLoading ? <Loader2 className="animate-spin" /> : <div className="songs-grid">{songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(song => (
              <div key={song.id} className="song-card">
                <div className="song-title">{song.title}</div>
                <div className="action-buttons"><button onClick={() => window.open(song.fileUrl)} className="btn btn-primary">Open</button><button onClick={() => setProjectingSong(song)} className="btn btn-success">Project</button></div>
              </div>
            ))}</div>}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="songs-grid">
            {videos.map(vid => (
              <div key={vid.id} className="song-card" style={{padding: '1rem'}}>
                 <div className="song-title" style={{marginBottom: '1rem', fontSize:'14px'}}>{vid.title}</div>
                 <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${vid.videoId}`} style={{borderRadius:'12px', border:'none'}} allowFullScreen></iframe>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'upload' && <UploadView setTab={setActiveTab} refresh={fetchEverything} />}
        {activeTab === 'admin' && isAdmin && (
           <AdminView 
             pendingSongs={pendingSongs} 
             approvedSongs={songs} 
             deletedSongs={deletedSongs}
             users={registeredUsers}
             videos={videos}
             feedbacks={feedbacks}
             refreshAll={fetchEverything} 
             currentUserIdentifier={userAuth.identifier}
           />
        )}
      </main>

      <AnimatePresence>
        {showFeedback && (
          <div className="login-overlay">
            <div className="login-box" style={{ maxWidth: '400px' }}>
              <h2>Feedback</h2>
              <div style={{display:'flex', gap:'10px', justifyContent:'center', margin:'20px 0'}}>{[1,2,3,4,5].map(s => <Star key={s} onClick={() => setUserRating(s)} fill={userRating >= s ? "gold" : "none"} color="gold" style={{cursor:'pointer'}} />)}</div>
              <textarea className="search-input" placeholder="Comment..." value={userComment} onChange={e => setUserComment(e.target.value)} style={{height:'100px', marginBottom:'20px'}} />
              <div style={{display:'flex', gap:'10px'}}><button onClick={() => setShowFeedback(false)} className="btn btn-outline" style={{flex:1}}>Close</button><button onClick={async () => {
                   setIsSubmittingFeedback(true);
                   await fetch('/api/feedback', { method: 'POST', body: JSON.stringify({ userId: userAuth.id, rating: userRating, comment: userComment }) });
                   setShowFeedback(false); fetchEverything(); setIsSubmittingFeedback(false);
                 }} className="btn btn-primary" style={{flex:1}}>{isSubmittingFeedback ? '...' : 'Submit'}</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

function LoginSplash({ onLogin }) {
  const [val, setVal] = useState('');
  const [userName, setUserName] = useState('');
  const [branch, setBranch] = useState('');
  const [isOtp, setIsOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [sOtp, setSOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const branches = ['Gokul plots', '4th Phase', 'Gachibowli', 'Moosapet'];

  const handleEnter = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ identifier: val, action: 'check', name: userName, branch }) });
    const data = await res.json();
    if(data.success) {
      if(data.isNew) { setSOtp(data.simulatedOtp); setIsOtp(true); alert("OTP: " + data.simulatedOtp); }
      else onLogin(data.user);
    }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if(otp === sOtp) {
       const res = await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ identifier: val, action: 'register', name: userName, branch }) });
       const data = await res.json();
       if(data.success) onLogin(data.user);
    } else alert("Wrong OTP");
  };

  return (
    <div className="login-overlay">
      <div className="login-box">
        {!isOtp ? (
          <form onSubmit={handleEnter}>
             <h2>Worship Portal</h2>
             <input className="search-input" style={{marginBottom:'10px'}} placeholder="Name" value={userName} onChange={e=>setUserName(e.target.value)} required />
             <select className="search-input" style={{marginBottom:'10px'}} value={branch} onChange={e=>setBranch(e.target.value)} required>
                <option value="">[ Select Branch ]</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
             </select>
             <input className="search-input" style={{marginBottom:'10px'}} placeholder="Mobile/Email" value={val} onChange={e=>setVal(e.target.value)} required />
             <button className="btn btn-primary" style={{width:'100%'}}>{loading ? '...' : 'Login'}</button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
             <h2>Verify OTP</h2>
             <input className="search-input" style={{marginBottom:'10px'}} placeholder="4 Digits" value={otp} onChange={e=>setOtp(e.target.value)} required />
             <button className="btn btn-success" style={{width:'100%'}}>Verify</button>
          </form>
        )}
      </div>
    </div>
  );
}

function UploadView({ setTab, refresh }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const handleUpload = async (e) => {
    e.preventDefault();
    const fd = new FormData(); fd.append('title', title); fd.append('file', file);
    await fetch('/api/songs', { method: 'POST', body: fd });
    alert('Sent for approval'); refresh(); setTab('songs');
  };
  return (
    <div className="upload-form">
      <h2>Upload Song</h2>
      <form onSubmit={handleUpload}>
        <input className="search-input" placeholder="Title" onChange={e=>setTitle(e.target.value)} required style={{marginBottom:'10px'}} />
        <input type="file" onChange={e=>setFile(e.target.files[0])} required style={{marginBottom:'20px'}} />
        <button className="btn btn-primary">Upload</button>
      </form>
    </div>
  );
}

function AdminView({ pendingSongs, approvedSongs, deletedSongs, users, videos, feedbacks, refreshAll, currentUserIdentifier }) {
  const [tab, setTab] = useState('songs');
  const [vTitle, setVTitle] = useState('');
  const [vUrl, setVUrl] = useState('');
  const [cIn, setCIn] = useState('');
  const [chat, setChat] = useState([{role:'bot', text:'Admin AI active.'}]);
  const [isBotThinking, setIsBotThinking] = useState(false);


  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = async (e) => {
    if (e.active.id !== e.over.id) {
       const oldI = approvedSongs.findIndex(s=>s.id === e.active.id);
       const newI = approvedSongs.findIndex(s=>s.id === e.over.id);
       const newOrder = arrayMove(approvedSongs, oldI, newI);
       await actions.updateSongOrder(newOrder.map(s=>s.id)); refreshAll();
    }
  };

  const onAddVideo = async () => {
    if(!vTitle || !vUrl) return;
    await actions.addVideo(vTitle, vUrl);
    setVTitle(''); setVUrl(''); alert('Video Added!'); refreshAll();
  };

  return (
    <div style={{marginTop:'20px'}}>
      <div className="nav-tabs">
        <button className={`nav-tab ${tab === 'songs' ? 'active' : ''}`} onClick={()=>setTab('songs')}>Directory</button>
        <button className={`nav-tab ${tab === 'videos' ? 'active' : ''}`} onClick={()=>setTab('videos')}>Manage Videos</button>
        <button className={`nav-tab ${tab === 'users' ? 'active' : ''}`} onClick={()=>setTab('users')}>Users</button>
        <button className={`nav-tab ${tab === 'feedback' ? 'active' : ''}`} onClick={()=>setTab('feedback')}>Feedback</button>
        <button className={`nav-tab ${tab === 'ai' ? 'active' : ''}`} onClick={()=>setTab('ai')}>AI Bot</button>
      </div>

      {tab === 'songs' && (
        <>
          <div className="admin-section">
            <h3>Pending</h3>
            {pendingSongs.map(s => <div key={s.id} className="admin-row"><span>{s.title}</span><div style={{display:'flex', gap:'5px'}}><button className="btn btn-success" onClick={async()=>{await actions.approveSong(s.id); refreshAll();}}><Check size={14}/></button><button className="btn btn-danger" onClick={async()=>{await actions.rejectSong(s.id); refreshAll();}}><Trash2 size={14}/></button></div></div>)}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={approvedSongs.map(s=>s.id)} strategy={verticalListSortingStrategy}>
              <div className="admin-section"><h3>Review Songs (Drag)</h3>{approvedSongs.map(s => <SortableRow key={s.id} id={s.id} title={s.title} adminIdentifier={currentUserIdentifier} onUpdate={refreshAll} onDel={async()=>{await actions.rejectSong(s.id); refreshAll();}} />)}</div>
            </SortableContext>
          </DndContext>
          <div className="admin-section">
             <h3>Administrator Activity Log</h3>
             <div style={{maxHeight:'300px', overflowY:'auto'}}>
                {approvedSongs.filter(s=>s.lastEditedBy).sort((a,b)=>new Date(b.lastEditedAt)-new Date(a.lastEditedAt)).map(s=>(
                   <div key={`log-${s.id}`} style={{fontSize:'13px', padding:'8px', borderBottom:'1px dashed #334155'}}>
                      <span className="text-primary-color">Title Update:</span> <strong>{s.title}</strong> was recently edited by <strong>{s.lastEditedBy}</strong>
                      <div style={{color:'#64748b', fontSize:'11px', marginTop:'2px'}}>{new Date(s.lastEditedAt).toLocaleString()}</div>
                   </div>
                ))}
             </div>
          </div>
        </>
      )}

      {tab === 'videos' && (
        <div className="admin-section">
           <h3>Submit New YouTube Video</h3>
           <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
             <input className="search-input" placeholder="Video Title" value={vTitle} onChange={e=>setVTitle(e.target.value)} />
             <input className="search-input" placeholder="URL" value={vUrl} onChange={e=>setVUrl(e.target.value)} />
             <button className="btn btn-primary" onClick={onAddVideo}><Plus size={16}/> Add</button>
           </div>
           <h3>Existing Videos</h3>
           <div className="admin-grid" style={{gridTemplateColumns:'1fr'}}>
              {videos.map(v => (
                <div key={v.id} className="admin-row">
                   <span>{v.title}</span>
                   <button className="btn btn-danger" onClick={async()=>{await actions.deleteVideo(v.id); refreshAll();}}><Trash2 size={14}/></button>
                </div>
              ))}
           </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-section">
           {users.map(u => (
             <div key={u.id} className="admin-row">
               <div>{u.name} ({u.branch}) - {u.loginCount} Logins</div>
               <div style={{display:'flex', gap:'5px'}}><button className="btn btn-outline" onClick={async()=>{await actions.toggleUserRole(u.id, u.role); refreshAll();}}>Role</button><button className="btn btn-danger" onClick={async()=>{await actions.deleteUser(u.id); refreshAll();}}><Trash2 size={14}/></button></div>
             </div>
           ))}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="admin-section">
           {feedbacks.map(f => <div key={f.id} style={{padding:'10px', borderBottom:'1px solid #334155'}}><strong>{f.users?.name || 'User'}</strong> ({f.rating} Stars): {f.comment}</div>)}
        </div>
      )}

      {tab === 'ai' && (
        <div className="admin-section" style={{height:'450px', display:'flex', flexDirection:'column'}}>
           <div style={{flex:1, overflowY:'auto', background:'rgba(0,0,0,0.3)', padding:'15px', borderRadius:'15px', marginBottom:'15px', display:'flex', flexDirection:'column', gap:'12px'}}>
              {chat.map((m,i)=>(
                 <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={i} style={{alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'80%'}}>
                    <div style={{
                       background: m.role==='user' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.05)',
                       color: m.role==='user' ? 'white' : '#e2e8f0',
                       padding: '10px 16px',
                       borderRadius: m.role==='user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                       fontSize: '14px',
                       boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                       border: m.role==='user' ? 'none' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                       {m.text}
                    </div>
                 </motion.div>
              ))}
              {isBotThinking && (
                 <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{alignSelf:'flex-start'}}>
                    <div style={{background:'rgba(255,255,255,0.05)', padding:'10px 16px', borderRadius:'18px 18px 18px 2px', fontSize:'14px', display:'flex', alignItems:'center', gap:'8px'}}>
                       <Loader2 size={14} className="animate-spin" /> Gemini is thinking...
                    </div>
                 </motion.div>
              )}
           </div>
           <div style={{display:'flex', gap:'10px'}}>
              <button 
                 className="btn btn-outline" 
                 onClick={()=>setChat([{role:'bot', text:'Chat cleared. How can I help?'}])}
                 style={{padding:'8px'}}
                 title="Clear Chat"
              >
                 <RotateCcw size={16}/>
              </button>
              <input 
                 className="search-input" 
                 value={cIn} 
                 onChange={e=>setCIn(e.target.value)} 
                 placeholder="Ask Gemini to rename songs, delete videos, or list data..." 
                 onKeyDown={async e => {
                    if(e.key==='Enter' && !isBotThinking && cIn.trim()){
                       const m = cIn; setCIn(''); setChat(p=>[...p,{role:'user',text:m}]);
                       setIsBotThinking(true);
                       try {
                          const res = await fetch('/api/admin/chat',{method:'POST',body:JSON.stringify({message:m,identifier:currentUserIdentifier})});
                          const d = await res.json();
                          setChat(p=>[...p,{role:'bot',text:d.text}]);
                          if(d.actions?.length > 0) refreshAll();
                       } catch(err) { setChat(p=>[...p,{role:'bot',text:'Connection error.'}]); }
                       setIsBotThinking(false);
                    }
                 }} 
              />
              <button 
                 className="btn btn-primary" 
                 disabled={isBotThinking || !cIn.trim()}
                 onClick={async()=>{
                    const m = cIn; setCIn(''); setChat(p=>[...p,{role:'user',text:m}]);
                    setIsBotThinking(true);
                    try {
                       const res = await fetch('/api/admin/chat',{method:'POST',body:JSON.stringify({message:m,identifier:currentUserIdentifier})});
                       const d = await res.json();
                       setChat(p=>[...p,{role:'bot',text:d.text}]);
                       if(d.actions?.length > 0) refreshAll();
                    } catch(err) { setChat(p=>[...p,{role:'bot',text:'Connection error.'}]); }
                    setIsBotThinking(false);
                 }}
              >
                 {isBotThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>}
              </button>
           </div>
        </div>
      )}

    </div>
  );
}

function SortableRow({ id, title, onDel, onUpdate, adminIdentifier }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({id});
  const style = { transform: CSS.Transform.toString(transform), transition };
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [isListening, setIsListening] = useState(false);

  const toggleListening = (e) => {
    e.stopPropagation();
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    if (isListening) return;
    
    setIsListening(true);
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'te-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setEditTitle(prev => prev ? prev + " " + transcript : transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    await actions.updateSongTitle(id, editTitle, adminIdentifier);
    setIsEditing(false);
    if(onUpdate) onUpdate();
  };

  return (
    <div ref={setNodeRef} style={style} className="admin-row">
      <GripVertical {...attributes} {...listeners} style={{cursor:'grab', flexShrink: 0}}/ >
      {isEditing ? (
        <div style={{flex:1, display:'flex', gap:'5px', alignItems:'center', marginLeft:'10px'}}>
          <input className="search-input" style={{flex:1}} value={editTitle} onChange={e=>setEditTitle(e.target.value)} onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} />
          <button className={`btn ${isListening ? 'btn-danger' : 'btn-outline'}`} onClick={toggleListening} title="Voice Record" onPointerDown={e=>e.stopPropagation()}>
             <Mic size={14} className={isListening ? 'animate-pulse' : ''} />
          </button>
          <button className="btn btn-success" onClick={handleSave} onPointerDown={e=>e.stopPropagation()}><Check size={14}/></button>
          <button className="btn btn-outline" onClick={(e)=>{e.stopPropagation(); setIsEditing(false);}} onPointerDown={e=>e.stopPropagation()}><X size={14}/></button>
        </div>
      ) : (
        <>
          <span style={{flex:1, marginLeft:'10px'}}>{title}</span>
          <button className="btn btn-outline" onClick={(e)=>{e.stopPropagation(); setIsEditing(true);}} onPointerDown={e=>e.stopPropagation()}><Edit3 size={14}/></button>
          <button className="btn btn-danger" onClick={(e)=>{e.stopPropagation(); onDel();}} onPointerDown={e=>e.stopPropagation()}><Trash2 size={14}/></button>
        </>
      )}
    </div>
  );
}
