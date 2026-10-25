import './globals.css';
import type {Metadata,Viewport} from 'next';
export const metadata:Metadata={title:'Heavyball Bets',description:'NFL Studio — paris et statistiques des boys',applicationName:'Heavyball Bets',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'Heavyball Bets',statusBarStyle:'black-translucent'},icons:{icon:'/heavyball-icon.svg'}};
export const viewport:Viewport={themeColor:'#09182d',width:'device-width',initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}