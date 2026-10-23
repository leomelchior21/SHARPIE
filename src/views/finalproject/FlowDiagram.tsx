import { useId } from "react";
import type { Scenario } from "./content";

export function FlowDiagram({ scenario:s, value, phase, result }: {scenario:Scenario;value:number;phase:number;result:boolean}) {
  const id=useId().replace(/:/g,"");
  const colors={idle:"#395777",blue:"#68b4ff",true:"#58f0b5",false:"#ff8295"};
  const wires=[
    {name:"start-input",d:"M280 48 V78",active:phase>=2,color:colors.blue},
    {name:"input-decision",d:"M280 132 V164",active:phase>=3,color:colors.blue},
    {name:"true-output",d:"M152 220 H138 Q126 220 126 232 V306",active:phase>=4&&result,color:colors.true},
    {name:"false-output",d:"M408 220 H422 Q434 220 434 232 V306",active:phase>=4&&!result,color:colors.false},
    {name:"true-end",d:"M126 362 V386 Q126 398 138 398 H268 Q280 398 280 410 V412",active:phase>=6&&result,color:colors.true},
    {name:"false-end",d:"M434 362 V386 Q434 398 422 398 H292 Q280 398 280 410 V412",active:phase>=6&&!result,color:colors.false},
  ];
  const node=(x:number,y:number,width:number,height:number,label:string,active:boolean,caption="",color=colors.blue,terminal=false)=><g className={`fp-svg-node ${active?"is-active":""}`} style={{"--node-color":color} as React.CSSProperties}>
    <rect x={x} y={y} width={width} height={height} rx={terminal?height/2:10}/>
    {caption&&<text className="fp-svg-caption" x={x+width/2} y={y+18}>{caption}</text>}
    <text x={x+width/2} y={y+(caption?height-13:height/2+7)}>{label}</text>
  </g>;
  return <div className="fp-flowchart"><svg className="fp-flow-svg" viewBox="0 0 560 464" role="img" aria-label={`Execution flowchart${phase>=4?`: ${result?"TRUE":"FALSE"} path`:""}`}>
    <defs>{Object.entries(colors).map(([name,color])=><marker key={name} id={`${id}-${name}`} markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill={color}/></marker>)}</defs>
    {wires.map(w=><g key={w.name}>
      <path className="fp-wire-track" d={w.d} stroke={colors.idle} markerEnd={`url(#${id}-idle)`}/>
      {w.active&&<path data-segment={w.name} className="fp-wire-fill" d={w.d} pathLength="1" stroke={w.color} markerEnd={`url(#${id}-${w.color===colors.blue?"blue":w.color===colors.true?"true":"false"})`}/>}</g>)}
    {node(205,12,150,36,"START",phase>=1,"",colors.blue,true)}
    {node(160,80,240,52,`${s.variable} = ${value}`,phase>=2,"READ INPUT")}
    <g className={`fp-svg-decision ${phase>=3?"is-active":""}`}><polygon points="280,166 408,220 280,274 152,220"/><text x="280" y="227">{s.condition} ?</text></g>
    <text className={`fp-svg-path-label true ${phase>=4&&result?"is-active":""}`} x="82" y="260">TRUE</text>
    <text className={`fp-svg-path-label false ${phase>=4&&!result?"is-active":""}`} x="478" y="260">FALSE</text>
    {node(18,308,216,54,s.yes,phase>=5&&result,"PRINT OUTPUT",colors.true)}
    {node(326,308,216,54,s.no,phase>=5&&!result,"PRINT OUTPUT",colors.false)}
    {node(205,414,150,36,"END",phase>=7,"",colors.blue,true)}
  </svg></div>;
}
