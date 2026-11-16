
// ========================================
// FourWays ONLINE SYSTEM
// Supabase接続・ルーム作成・参加・待機
// ========================================

const SUPABASE_URL = "https://mdelzfwcuszpfovhdxsj.supabase.co";
const SUPABASE_KEY = "sb_publishable_th3ofJ3Gpby51m7NMFQy3w_dccgZjiy";

let supabaseClient = null;
let onlineUser = null;
let currentRoom = null;
let roomChannel = null;
let currentSeat = null;
let isOnlineReady = false;

// プレイヤー情報
const SEAT_NAMES = {
  1: "RED",
  2: "BLUE",
  3: "GREEN",
  4: "PURPLE"
};

// ========================================
// Supabase初期化
// ========================================

async function initializeOnline() {
  const status = document.getElementById("onlineStatus");

  try {
    if (!window.supabase) {
      throw new Error("Supabaseライブラリが読み込まれていません");
    }

    if (
      SUPABASE_URL.includes("ここに") ||
      SUPABASE_KEY.includes("ここに")
    ) {
      throw new Error("Supabaseの接続情報を設定してください");
    }

    status.textContent = "接続しています...";

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data.session) {
      onlineUser = data.session.user;
    } else {
      const result =
        await supabaseClient.auth.signInAnonymously();

      if (result.error) throw result.error;

      onlineUser = result.data.user;
    }

    if (!onlineUser) {
      throw new Error("ユーザー情報を取得できませんでした");
    }

    isOnlineReady = true;

    status.textContent = "🟢 オンライン接続成功！";
    status.className = "online-status success";

    setupOnlineUI();

    console.log("FourWaysオンライン接続成功");

    return true;

  } catch (error) {
    console.error("接続エラー:", error);

    status.textContent = "🔴 " + error.message;
    status.className = "online-status error";

    return false;
  }
}

// ========================================
// オンライン画面を追加
// ========================================

function setupOnlineUI() {
  const modeSelect = document.getElementById("gameMode");
  const setupPanel = document.getElementById("setupPanel");

  if (!modeSelect || !setupPanel) return;

  if (!modeSelect.querySelector('option[value="online"]')) {
    const option = document.createElement("option");
    option.value = "online";
    option.textContent = "オンライン対戦";
    modeSelect.appendChild(option);
  }

  if (document.getElementById("onlinePanel")) return;

  const style = document.createElement("style");

  style.textContent = `
    .online-panel {
      display:none;
      background:#202d42;
      border:1px solid #52637d;
      border-radius:12px;
      padding:18px;
      gap:12px;
      flex-direction:column;
    }

    .online-panel.visible {
      display:flex;
    }

    .online-panel h3 {
      margin:0;
      text-align:center;
      color:#f4cd54;
    }

    .online-panel p {
      text-align:center;
      color:#aab8cd;
      font-size:12px;
      margin:0;
    }

    .online-panel input {
      width:100%;
      padding:13px;
      border-radius:8px;
      border:1px solid #52637d;
      background:#101522;
      color:white;
      font-size:18px;
      text-align:center;
      letter-spacing:4px;
      box-sizing:border-box;
    }

    .online-main-button {
      background:#d9ad38;
      color:#171717;
      border-color:#d9ad38;
    }

    .online-room {
      display:none;
      background:#101522;
      padding:15px;
      border-radius:10px;
      margin-top:8px;
    }

    .online-room.visible {
      display:block;
    }

    .room-code {
      font-size:30px;
      font-weight:bold;
      color:#f4cd54;
      text-align:center;
      letter-spacing:6px;
      margin:12px 0;
    }

    .online-player {
      display:flex;
      justify-content:space-between;
      padding:11px;
      margin-top:7px;
      border-radius:7px;
      background:#29364a;
      font-size:13px;
    }

    .online-player.waiting {
      color:#8190a8;
    }

    .online-player.joined {
      border-left:4px solid #31c58a;
    }

    .online-message {
      text-align:center;
      font-size:12px;
      color:#aab8cd;
      min-height:18px;
      margin-top:10px;
    }

    .online-status {
      text-align:center;
      margin:12px auto;
      font-size:12px;
      color:#aab8cd;
    }

    .online-status.success {
      color:#31c58a;
    }

    .online-status.error {
      color:#ed4b50;
    }
  `;

  document.head.appendChild(style);

  const panel = document.createElement("div");

  panel.id = "onlinePanel";
  panel.className = "online-panel";

  panel.innerHTML = `
    <h3>🌐 ONLINE MATCH</h3>

    <p>友達と4人でFourWaysをプレイしよう！</p>

    <button id="createRoomButton"
      class="online-main-button">
      ＋ 部屋を作る
    </button>

    <div style="text-align:center;color:#8190a8;">
      ― または ―
    </div>

    <input
      id="roomCodeInput"
      type="text"
      maxlength="6"
      inputmode="numeric"
      placeholder="6桁のルームコード"
    >

    <button id="joinRoomButton">
      部屋に参加する
    </button>

    <div id="onlineRoom" class="online-room">

      <div style="text-align:center;color:#aab8cd;">
        ROOM CODE
      </div>

      <div id="roomCodeDisplay" class="room-code"></div>

      <button id="copyRoomCodeButton">
        コードをコピー
      </button>

      <h3 style="margin-top:20px;">PLAYERS</h3>

      <div id="onlinePlayerList"></div>

      <div id="roomMessage" class="online-message">
        参加者を待っています...
      </div>

      <button id="leaveRoomButton">
        ルームから退出
      </button>

    </div>
  `;

  const startButton = document.getElementById("startGame");

  setupPanel.insertBefore(panel, startButton);

  modeSelect.addEventListener("change", updateOnlineMode);

  document.getElementById("createRoomButton")
    .addEventListener("click", createRoom);

  document.getElementById("joinRoomButton")
    .addEventListener("click", joinRoom);

  document.getElementById("copyRoomCodeButton")
    .addEventListener("click", copyRoomCode);

  document.getElementById("leaveRoomButton")
    .addEventListener("click", leaveRoom);

  document.getElementById("roomCodeInput")
    .addEventListener("input", event => {
      event.target.value =
        event.target.value.replace(/\D/g, "").slice(0, 6);
    });

  updateOnlineMode();
}

// ========================================
// オンラインモード切り替え
// ========================================

function updateOnlineMode() {
  const onlineMode =
    document.getElementById("gameMode").value === "online";

  document.getElementById("onlinePanel")
    ?.classList.toggle("visible", onlineMode);

  const startButton = document.getElementById("startGame");

  if (startButton) {
    startButton.style.display = onlineMode ? "none" : "";
  }
}

// ========================================
// ルームコード生成
// ========================================

function generateRoomCode() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);

  return String(array[0] % 1000000).padStart(6, "0");
}

// ========================================
// ルーム作成
// ========================================

async function createRoom() {
  if (!isOnlineReady || !onlineUser) {
    alert("オンライン接続が完了していません");
    return;
  }

  const button = document.getElementById("createRoomButton");

  button.disabled = true;
  button.textContent = "作成中...";

  try {
    let room = null;

    for (let i = 0; i < 10; i++) {
      const code = generateRoomCode();

      const result = await supabaseClient
        .from("fourways_rooms")
        .insert({
          room_code: code,
          host_id: onlineUser.id,
          status: "waiting"
        })
        .select()
        .single();

      if (!result.error) {
        room = result.data;
        break;
      }

      if (result.error.code !== "23505") {
        throw result.error;
      }
    }

    if (!room) {
      throw new Error("ルームコードを発行できませんでした");
    }

    const { error } = await supabaseClient
      .from("fourways_players")
      .insert({
        room_id: room.id,
        user_id: onlineUser.id,
        player_name: "RED",
        seat: 1
      });

    if (error) {
      await supabaseClient
        .from("fourways_rooms")
        .delete()
        .eq("id", room.id);

      throw error;
    }

    await enterRoom(room, 1);

  } catch (error) {
    console.error(error);
    alert("ルーム作成エラー: " + error.message);

  } finally {
    button.disabled = false;
    button.textContent = "＋ 部屋を作る";
  }
}

// ========================================
// ルーム参加
// ========================================

async function joinRoom() {
  if (!isOnlineReady || !onlineUser) {
    alert("オンライン接続が完了していません");
    return;
  }

  const code = document
    .getElementById("roomCodeInput")
    .value.trim();

  if (!/^\d{6}$/.test(code)) {
    alert("6桁のルームコードを入力してください");
    return;
  }

  const button = document.getElementById("joinRoomButton");

  button.disabled = true;
  button.textContent = "参加中...";

  try {
    const { data: room, error } = await supabaseClient
      .from("fourways_rooms")
      .select("*")
      .eq("room_code", code)
      .eq("status", "waiting")
      .maybeSingle();

    if (error) throw error;

    if (!room) {
      throw new Error("ルームが見つからないか、対戦中です");
    }

    // すでに参加している場合
    const { data: existing } = await supabaseClient
      .from("fourways_players")
      .select("*")
      .eq("room_id", room.id)
      .eq("user_id", onlineUser.id)
      .maybeSingle();

    if (existing) {
      await enterRoom(room, existing.seat);
      return;
    }

    const { data: players, error: playersError } =
      await supabaseClient
        .from("fourways_players")
        .select("seat")
        .eq("room_id", room.id);

    if (playersError) throw playersError;

    if (players.length >= 4) {
      throw new Error("このルームは満員です");
    }

    const usedSeats = players.map(p => p.seat);

    const seat = [1, 2, 3, 4].find(
      number => !usedSeats.includes(number)
    );

    if (!seat) {
      throw new Error("空き席がありません");
    }

    const { error: joinError } = await supabaseClient
      .from("fourways_players")
      .insert({
        room_id: room.id,
        user_id: onlineUser.id,
        player_name: SEAT_NAMES[seat],
        seat: seat
      });

    if (joinError) {
      throw joinError;
    }

    await enterRoom(room, seat);

  } catch (error) {
    console.error(error);
    alert("参加エラー: " + error.message);

  } finally {
    button.disabled = false;
    button.textContent = "部屋に参加する";
  }
}

// ========================================
// ルーム入室
// ========================================

async function enterRoom(room, seat) {
  currentRoom = room;
  currentSeat = seat;

  document.getElementById("onlineRoom")
    .classList.add("visible");

  document.getElementById("roomCodeDisplay")
    .textContent = room.room_code;

  document.getElementById("roomMessage")
    .textContent = "参加者を確認しています...";

  await refreshRoom();

  if (roomChannel) {
    await supabaseClient.removeChannel(roomChannel);
  }

  roomChannel = supabaseClient
    .channel("fourways-room-" + room.id)

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "fourways_players",
        filter: "room_id=eq." + room.id
      },
      () => refreshRoom()
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "fourways_rooms",
        filter: "id=eq." + room.id
      },
      () => refreshRoom()
    )

    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        console.log("ルーム同期開始");
      }
    });
}

// ========================================
// 参加者一覧の更新
// ========================================

async function refreshRoom() {
  if (!currentRoom) return;

  try {
    const { data: room, error: roomError } =
      await supabaseClient
        .from("fourways_rooms")
        .select("*")
        .eq("id", currentRoom.id)
        .maybeSingle();

    if (roomError) throw roomError;

    if (!room) {
      alert("ルームが終了しました");
      await leaveRoom(false);
      return;
    }

    currentRoom = room;

    const { data: players, error } =
      await supabaseClient
        .from("fourways_players")
        .select("*")
        .eq("room_id", room.id)
        .order("seat");

    if (error) throw error;

    const list = document.getElementById("onlinePlayerList");

    list.innerHTML = "";

    for (let seat = 1; seat <= 4; seat++) {
      const player = players.find(p => p.seat === seat);

      const item = document.createElement("div");

      item.className =
        "online-player " + (player ? "joined" : "waiting");

      const name = document.createElement("span");
      name.textContent =
        "● " + SEAT_NAMES[seat];

      const state = document.createElement("span");
      state.textContent = player
        ? (player.user_id === onlineUser.id
            ? "あなた"
            : "参加済み")
        : "参加待ち";

      item.appendChild(name);
      item.appendChild(state);

      list.appendChild(item);
    }

    const message = document.getElementById("roomMessage");

    if (players.length === 4) {
      message.textContent =
        "🎉 4人そろいました！対戦開始の準備ができました！";
    } else {
      message.textContent =
        players.length + "/4 人参加中。残り" +
        (4 - players.length) + "人を待っています...";
    }

  } catch (error) {
    console.error("ルーム更新エラー:", error);
  }
}

// ========================================
// コードコピー
// ========================================

async function copyRoomCode() {
  if (!currentRoom) return;

  try {
    await navigator.clipboard.writeText(
      currentRoom.room_code
    );

    document.getElementById("copyRoomCodeButton")
      .textContent = "コピーしました！";

  } catch (error) {
    alert("コード: " + currentRoom.room_code);
  }
}

// ========================================
// ルーム退出
// ========================================

async function leaveRoom(showMessage = true) {
  if (!currentRoom || !onlineUser) return;

  const roomId = currentRoom.id;
  const isHost = currentRoom.host_id === onlineUser.id;

  try {
    if (roomChannel) {
      await supabaseClient.removeChannel(roomChannel);
      roomChannel = null;
    }

    if (isHost) {
      // ホストが退出した場合はルームも削除
      const { error } = await supabaseClient
        .from("fourways_rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

    } else {
      const { error } = await supabaseClient
        .from("fourways_players")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", onlineUser.id);

      if (error) throw error;
    }

    currentRoom = null;
    currentSeat = null;

    document.getElementById("onlineRoom")
      .classList.remove("visible");

    if (showMessage) {
      document.getElementById("roomMessage")
        .textContent = "ルームから退出しました";
    }

  } catch (error) {
    console.error(error);
    alert("退出エラー: " + error.message);
  }
}

// ========================================
// 外部から利用できる関数
// ========================================

window.initializeOnline = initializeOnline;
window.getOnlineClient = () => supabaseClient;
window.getOnlineUser = () => onlineUser;
window.getCurrentOnlineRoom = () => currentRoom;
window.getCurrentOnlineSeat = () => currentSeat;
