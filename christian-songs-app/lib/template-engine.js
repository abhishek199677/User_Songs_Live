export const MOTION_THEMES = [
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    url: 'https://cdn.pixabay.com/video/2016/11/04/6223-189689885_tiny.mp4',
    overlay: 'rgba(15, 23, 42, 0.4)'
  },
  {
    id: 'serene',
    name: 'Serene Nature',
    url: 'https://cdn.pixabay.com/video/2016/09/21/5496-184562098_tiny.mp4',
    overlay: 'rgba(20, 83, 45, 0.4)'
  },
  {
    id: 'ethereal',
    name: 'Ethereal Glow',
    url: 'https://cdn.pixabay.com/video/2019/04/16/22909-331604724_tiny.mp4',
    overlay: 'rgba(76, 29, 149, 0.4)'
  }
];

export const getTemplateStyle = (themeId) => {
  const theme = MOTION_THEMES.find(t => t.id === themeId) || MOTION_THEMES[0];
  return {
    container: {
       position: 'relative',
       width: '100%',
       aspectRatio: '16/9',
       background: '#000',
       overflow: 'hidden',
       borderRadius: '16px',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       textAlign: 'center',
       color: 'white',
       textShadow: '0 4px 10px rgba(0,0,0,0.8)',
       padding: '2rem'
    },
    video: {
       position: 'absolute',
       top: 0, left: 0, width: '100%', height: '100%',
       objectFit: 'cover',
       opacity: 0.6
    },
    overlay: {
       position: 'absolute',
       top: 0, left: 0, width: '100%', height: '100%',
       background: theme.overlay
    },
    content: {
       position: 'relative',
       zIndex: 10,
       fontSize: '2.5rem',
       fontWeight: 800,
       lineHeight: 1.4,
       fontFamily: "'Inter', sans-serif"
    }
  };
};
