'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
let keyboardNavigation=false;
export function PanelMotion({children}:{children:React.ReactNode}){
  const scope=useRef<HTMLDivElement>(null);const pathname=usePathname();
  useEffect(()=>{const key=()=>{keyboardNavigation=true;};const pointer=()=>{keyboardNavigation=false;};document.addEventListener('keydown',key);document.addEventListener('pointerdown',pointer);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',pointer);};},[]);
  useEffect(()=>{
    if(keyboardNavigation||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let disposed=false;let revert:(()=>void)|undefined;
    void Promise.all([import('gsap'),import('gsap/CustomEase')]).then(([{gsap},{CustomEase}])=>{
      if(disposed)return;
      gsap.registerPlugin(CustomEase);
      const ease=CustomEase.create('loca7-entry','0.23,1,0.32,1');
      const items=scope.current?.querySelectorAll('.module-heading,.operation-welcome,.sales-hero,.module-summary');
      if(items?.length){const context=gsap.context(()=>{gsap.fromTo(items,{y:8,opacity:.75},{y:0,opacity:1,duration:.24,stagger:.03,ease,clearProps:'transform,opacity'});},scope);revert=()=>context.revert();}
    }).catch(()=>{});
    return()=>{disposed=true;revert?.();};
  },[pathname]);
  return <div ref={scope} className="panel-motion">{children}</div>;
}
