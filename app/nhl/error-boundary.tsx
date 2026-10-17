"use client";
import React from "react";
export default class NhlErrorBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}> {
 state:{error:Error|null}={error:null};
 static getDerivedStateFromError(error:Error){return {error};}
 componentDidCatch(error:Error,info:React.ErrorInfo){console.error("NHL client error",error,info.componentStack);}
 render(){if(this.state.error)return <main style={{minHeight:"100vh",background:"#111d28",color:"#eef3f7",padding:24,fontFamily:"Arial,sans-serif"}}><section style={{maxWidth:600,margin:"auto",padding:20,border:"1px solid #7890a0",borderRadius:12}}><h1>Diagnostic NHL Studio</h1><p>Une erreur JavaScript s'est produite :</p><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",padding:14,background:"#071521"}}>{this.state.error.name}: {this.state.error.message}</pre><button onClick={()=>window.location.reload()} style={{padding:12}}>Réessayer</button></section></main>;return this.props.children;}
}