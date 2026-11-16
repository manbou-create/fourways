
const SIZE=11;
const GOAL={x:5,y:5};
const initialPlayers=[
{id:"red",name:"RED",color:"🔴",x:5,y:0,walls:10},
{id:"blue",name:"BLUE",color:"🔵",x:10,y:5,walls:10},
{id:"green",name:"GREEN",color:"🟢",x:5,y:10,walls:10},
{id:"purple",name:"PURPLE",color:"🟣",x:0,y:5,walls:10}
];
let players=[],walls=[],currentPlayer=0,round=1,mode="move",wallType="horizontal",gameOver=false,gameStarted=false,gameMode="ai",aiDifficulty="normal",legalMoves=[],aiTimer=null;
const board=document.getElementById("board");
const message=document.getElementById("message");
const $=id=>document.getElementById(id);

function inside(x,y){return x>=0&&x<SIZE&&y>=0&&y<SIZE}
function getPlayerAt(x,y){return players.find(p=>p.x===x&&p.y===y)}
function isAI(p){return gameMode==="ai"&&p.id!=="red"}

function isBlocked(x1,y1,x2,y2){
return walls.some(w=>{
if(w.type==="horizontal")return x1===x2&&(x1===w.x||x1===w.x+1)&&Math.min(y1,y2)===w.y;
return y1===y2&&(y1===w.y||y1===w.y+1)&&Math.min(x1,x2)===w.x;
});
}
function canStep(x1,y1,x2,y2){return inside(x2,y2)&&!isBlocked(x1,y1,x2,y2)}

function calculateMoves(p){
const moves=[],directions=[[0,-1],[1,0],[0,1],[-1,0]];
function add(x,y){
if(inside(x,y)&&!getPlayerAt(x,y)&&!moves.some(m=>m.x===x&&m.y===y))moves.push({x,y});
}
for(const [dx,dy] of directions){
const nx=p.x+dx,ny=p.y+dy;
if(!canStep(p.x,p.y,nx,ny))continue;
const opponent=getPlayerAt(nx,ny);
if(!opponent){add(nx,ny);continue}
const bx=nx+dx,by=ny+dy;
if(canStep(nx,ny,bx,by)&&!getPlayerAt(bx,by)){add(bx,by)}
else{
for(const [sx,sy] of [[-dy,dx],[dy,-dx]]){
const tx=nx+sx,ty=ny+sy;
if(canStep(nx,ny,tx,ty)&&!getPlayerAt(tx,ty))add(tx,ty);
}
}
}
return moves;
}

// 壁を考慮した最短ルート探索
function distanceFrom(x,y){
const queue=[[x,y,0]];
const visited=new Set([`${x},${y}`]);
const directions=[[0,-1],[1,0],[0,1],[-1,0]];
let index=0;
while(index<queue.length){
const [cx,cy,d]=queue[index++];
if(cx===GOAL.x&&cy===GOAL.y)return d;
for(const [dx,dy] of directions){
const nx=cx+dx,ny=cy+dy,k=`${nx},${ny}`;
if(!inside(nx,ny)||visited.has(k)||isBlocked(cx,cy,nx,ny))continue;
visited.add(k);
queue.push([nx,ny,d+1]);
}
}
return Infinity;
}
function pathDistance(p){return distanceFrom(p.x,p.y)}
function allPlayersHavePath(){return players.every(p=>pathDistance(p)!==Infinity)}

function wallConflicts(x,y,type){
for(const w of walls){
if(w.x===x&&w.y===y&&w.type===type)return true;
if(w.type===type){
if(type==="horizontal"&&w.y===y&&Math.abs(w.x-x)<=1)return true;
if(type==="vertical"&&w.x===x&&Math.abs(w.y-y)<=1)return true;
}
if(w.x===x&&w.y===y&&w.type!==type)return true;
}
return false;
}

function canPlaceWall(x,y,type){
return inside(x,y)&&x<SIZE-1&&y<SIZE-1&&!wallConflicts(x,y,type);
}

function isWallPlacementLegal(x,y,type){
if(!canPlaceWall(x,y,type))return false;
walls.push({x,y,type,owner:players[currentPlayer].id});
const result=allPlayersHavePath();
walls.pop();
return result;
}

function showWallPreview(cell,x,y){
if(mode!=="wall"||gameOver||isAI(players[currentPlayer]))return;
cell.querySelector(".wall-preview")?.remove();
const legal=players[currentPlayer].walls>0&&isWallPlacementLegal(x,y,wallType);
const preview=document.createElement("div");
preview.className=`wall-preview ${wallType} ${legal?"legal":"illegal"}`;
cell.appendChild(preview);
}

function placeWall(x,y){
const p=players[currentPlayer];
if(p.walls<=0){message.textContent="壁が残っていません！";return false}
if(!canPlaceWall(x,y,wallType)){message.textContent="そこには壁を設置できません！";return false}
walls.push({x,y,type:wallType,owner:p.id});
if(!allPlayersHavePath()){
walls.pop();
message.textContent="全員のゴールへの道を残してください！";
return false;
}
p.walls--;
message.textContent=p.color+" "+p.name+" が壁を設置しました！";
nextTurn();
return true;
}

function addWallVisual(cell,w){
const visual=document.createElement("div");
visual.className="wall-visual "+w.type+" owner-"+w.owner;
cell.appendChild(visual);
}

function render(){
if(!gameStarted)return;
board.innerHTML="";
const p=players[currentPlayer];
legalMoves=calculateMoves(p);
for(let y=0;y<SIZE;y++){
for(let x=0;x<SIZE;x++){
const cell=document.createElement("div");
cell.className="cell";
cell.dataset.x=x;
cell.dataset.y=y;
if(x===GOAL.x&&y===GOAL.y)cell.classList.add("goal");
if(x===5&&y===0)cell.classList.add("start-red");
if(x===10&&y===5)cell.classList.add("start-blue");
if(x===5&&y===10)cell.classList.add("start-green");
if(x===0&&y===5)cell.classList.add("start-purple");
if(mode==="move"&&!isAI(p)&&legalMoves.some(m=>m.x===x&&m.y===y))cell.classList.add("legal");
const player=getPlayerAt(x,y);
if(player){
const piece=document.createElement("div");
piece.className="piece "+player.id;
cell.appendChild(piece);
}
const horizontal=walls.find(w=>w.type==="horizontal"&&w.x===x&&w.y===y);
if(horizontal)addWallVisual(cell,horizontal);
const vertical=walls.find(w=>w.type==="vertical"&&w.x===x&&w.y===y);
if(vertical)addWallVisual(cell,vertical);
if(mode==="wall"&&!isAI(p))cell.classList.add("wall-candidate");
cell.addEventListener("mouseenter",()=>showWallPreview(cell,x,y));
cell.addEventListener("mouseleave",()=>cell.querySelector(".wall-preview")?.remove());
cell.addEventListener("click",()=>handleCell(x,y));
board.appendChild(cell);
}
}
$("turnPlayer").textContent=p.color+" "+p.name+(isAI(p)?" AI":" PLAYER");
$("turnNumber").textContent="ROUND "+round;
$("players").innerHTML=players.map((q,i)=>`
<div class="player ${i===currentPlayer?"current":""}">
<div class="player-name">${q.color} ${q.name}</div>
<div class="player-walls">WALLS: ${q.walls}/10</div>
<div class="player-type">${isAI(q)?"AI":"PLAYER"}</div>
</div>`).join("");
$("moveMode").classList.toggle("active",mode==="move");
$("wallMode").classList.toggle("active",mode==="wall");
$("wallDirection").classList.toggle("selected",mode==="wall"&&wallType==="horizontal");
$("verticalDirection").classList.toggle("selected",mode==="wall"&&wallType==="vertical");
}

function handleCell(x,y){
if(gameOver||!gameStarted||isAI(players[currentPlayer]))return;
if(mode==="wall"){placeWall(x,y);return}
const target=legalMoves.find(m=>m.x===x&&m.y===y);
if(!target){
message.textContent=getPlayerAt(x,y)?"相手のコマがいるマスには止まれません。":"黄色く光っているマスを選んでください！";
return;
}
movePlayer(x,y);
}

function movePlayer(x,y){
const p=players[currentPlayer];
p.x=x;
p.y=y;
if(x===GOAL.x&&y===GOAL.y){
gameOver=true;
message.textContent=p.color+" "+p.name+(isAI(p)?" AI":"")+" の勝利！！🏆";
render();
return;
}
message.textContent=p.color+" "+p.name+" が移動しました！";
nextTurn();
}

function nextTurn(){
if(gameOver)return;
currentPlayer++;
if(currentPlayer>=players.length){currentPlayer=0;round++}
mode="move";
const p=players[currentPlayer];
message.textContent=p.color+" "+p.name+(isAI(p)?" AIの思考中...":" のターンです。");
render();
if(isAI(p))scheduleAI();
}

function cancelWallMode(){
if(gameOver||isAI(players[currentPlayer]))return;
mode="move";
message.textContent="壁の設置をキャンセルしました。";
render();
}

function chooseWallType(type){
if(gameOver||isAI(players[currentPlayer]))return;
if(mode==="wall"&&wallType===type){
cancelWallMode();
return;
}
wallType=type;
mode="wall";
message.textContent=(type==="horizontal"?"横壁":"縦壁")+"を置く場所を選んでください。";
render();
}

function startGame(){
clearTimeout(aiTimer);
gameMode=$("gameMode").value;
aiDifficulty=$("aiDifficulty").value;
players=initialPlayers.map(p=>({...p}));
walls=[];
currentPlayer=0;
round=1;
mode="move";
gameOver=false;
gameStarted=true;
$("setupPanel").classList.add("hidden");
$("gameArea").classList.remove("hidden");
message.textContent=gameMode==="ai"?"🔴 あなたのターンです。":"🔴 赤プレイヤーのターンです。";
render();
}

// AIが移動先を戦略的に選ぶ
function chooseAIMove(p,moves){
const scored=moves.map(m=>{
const distance=distanceFrom(m.x,m.y);
let score=distance;
const centerDistance=Math.abs(m.x-GOAL.x)+Math.abs(m.y-GOAL.y);
score+=centerDistance*0.025;

for(const rival of players){
if(rival.id===p.id)continue;
const rivalDistance=pathDistance(rival);
const nextRivalDistance=Math.abs(m.x-rival.x)+Math.abs(m.y-rival.y);
if(rivalDistance<=3&&nextRivalDistance<=1)score+=0.12;
}

score+=Math.random()*0.025;
return {...m,score};
});
scored.sort((a,b)=>a.score-b.score);
if(aiDifficulty==="easy"&&Math.random()<0.3){
return moves[Math.floor(Math.random()*moves.length)];
}
if(aiDifficulty==="normal"&&Math.random()<0.06){
return scored[Math.min(1,scored.length-1)];
}
return scored[0];
}

// 全員への妨害効果を比較して、最も有効な壁を探す
function chooseAIWall(p){
if(p.walls<=0||aiDifficulty==="easy")return null;

const before=new Map();
for(const rival of players)before.set(rival.id,pathDistance(rival));

const ownBefore=before.get(p.id);
const rivals=players.filter(q=>q.id!==p.id);
const closestRival=Math.min(...rivals.map(q=>before.get(q.id)));
const bestRivalDistance=closestRival;
let best=null;

for(let y=0;y<SIZE-1;y++){
for(let x=0;x<SIZE-1;x++){
for(const type of ["horizontal","vertical"]){
if(!canPlaceWall(x,y,type))continue;

walls.push({x,y,type,owner:p.id});
let valid=true;
const after=new Map();

for(const rival of players){
const d=pathDistance(rival);
after.set(rival.id,d);
if(!Number.isFinite(d)){valid=false;break}
}
walls.pop();
if(!valid)continue;

const ownCost=after.get(p.id)-ownBefore;

// 自分の道を長くする壁は避ける
if(ownCost>0)continue;

let score=0;
let affected=0;
let leaderAffected=0;

for(const rival of rivals){
const oldDistance=before.get(rival.id);
const newDistance=after.get(rival.id);
const gain=newDistance-oldDistance;
if(gain<=0)continue;

affected++;
if(oldDistance===bestRivalDistance)leaderAffected++;

// ゴールに近い相手、そして自分より先行している相手を重視
const closeness=Math.max(0,7-oldDistance)/7;
const threat=Math.max(0,ownBefore-oldDistance);
const weight=0.65+closeness*0.65+Math.min(threat,4)*0.2;
score+=Math.min(gain,3)*weight;
}

if(affected>=2)score+=0.4;
if(leaderAffected>0)score+=0.3;
if(ownCost<0)score+=Math.min(-ownCost,2)*0.15;

score+=Math.random()*0.02;

if(!best||score>best.score)best={x,y,type,score};
}
}
}
return best;
}

// 戦況によって壁を使う基準を変える。壁の残り枚数は判断に使わない
function getWallThreshold(p){
const rivals=players.filter(q=>q.id!==p.id);
const closestRival=Math.min(...rivals.map(q=>pathDistance(q)));
const ownDistance=pathDistance(p);
const lead=ownDistance-closestRival;

let threshold=1.5;

// 序盤でも複数人に大きな効果がある壁なら使う
if(closestRival>=5)threshold=1.65;
else if(closestRival===4)threshold=1.45;
else if(closestRival===3)threshold=1.2;
else if(closestRival===2)threshold=0.95;
else threshold=0.8;

// 自分が大きく先行しているならリードを守る
if(lead<=-2)threshold-=0.15;

// 自分が遅れているなら、妨害より前進を優先
if(lead>=3)threshold+=0.2;

if(aiDifficulty==="hard")threshold-=0.2;
return threshold;
}

function runAI(){
if(gameOver||!isAI(players[currentPlayer]))return;
const p=players[currentPlayer];
const moves=calculateMoves(p);
if(!moves.length){nextTurn();return}

// ゴールに入れるなら必ず移動
const winningMove=moves.find(m=>m.x===GOAL.x&&m.y===GOAL.y);
if(winningMove){movePlayer(winningMove.x,winningMove.y);return}

const bestMove=chooseAIMove(p,moves);
const wall=chooseAIWall(p);

if(wall){
const currentDistance=pathDistance(p);
const moveDistance=distanceFrom(bestMove.x,bestMove.y);
const moveGain=currentDistance-moveDistance;

// 移動のメリットが大きいときは移動を優先
const moveBonus=moveGain>=2?0.35:moveGain===1?0.15:0;
const threshold=getWallThreshold(p)+moveBonus;

if(wall.score>=threshold){
walls.push({x:wall.x,y:wall.y,type:wall.type,owner:p.id});
p.walls--;
message.textContent=p.color+" "+p.name+" AIが戦況を読んで壁を設置！";
nextTurn();
return;
}
}

movePlayer(bestMove.x,bestMove.y);
}

function scheduleAI(){
clearTimeout(aiTimer);
if(gameOver||!isAI(players[currentPlayer]))return;
aiTimer=setTimeout(runAI,650);
}

$("startGame").addEventListener("click",startGame);

$("moveMode").addEventListener("click",()=>{
if(gameOver||isAI(players[currentPlayer]))return;
mode="move";
message.textContent="コマ移動モードです。";
render();
});

$("wallMode").addEventListener("click",()=>{
if(gameOver||isAI(players[currentPlayer]))return;
mode="wall";
message.textContent="下の壁一覧から形を選んでください。";
render();
});

$("wallDirection").addEventListener("click",()=>chooseWallType("horizontal"));
$("verticalDirection").addEventListener("click",()=>chooseWallType("vertical"));

$("backToSetup").addEventListener("click",()=>{
clearTimeout(aiTimer);
gameStarted=false;
gameOver=true;
$("gameArea").classList.add("hidden");
$("setupPanel").classList.remove("hidden");
});

document.addEventListener("keydown",e=>{
if(e.key==="Escape"&&mode==="wall")cancelWallMode();
});
