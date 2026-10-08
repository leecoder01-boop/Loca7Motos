import { cn } from '@/lib/utils';
export function Brand({className}:{className?:string}){
  return <div className={cn('brand',className)} aria-label="Loca7Moto"><span className="brand-mark" aria-hidden="true">7</span><div><span className="brand-word">loca<span>7</span>moto</span><span className="brand-caption">GESTÃO DE LOCAÇÕES</span></div></div>;
}
