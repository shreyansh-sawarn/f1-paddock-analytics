export default function manifest() {
  return {
    name: 'F1 Paddock Analytics',
    short_name: 'F1 Paddock Analytics',
    description: 'Real-time F1 schedule, archive, and analytics.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'apple touch icon',
      },
    ],
  };
}
