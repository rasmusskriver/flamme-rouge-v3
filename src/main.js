import "./style.css";
import supabase from "./supabase.js";
import { showGameScreen } from "./game.js";

// Generer en tilfældig 6-cifret spilkode
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Tilføj en spiller til et spil
async function addPlayerToGame(gameId, playerName) {
  try {
    const { data, error } = await supabase
      .from("players")
      .insert([
        {
          game_id: gameId,
          name: playerName || `Spiller ${Date.now()}`
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Fejl ved tilføjelse af spiller:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Uventet fejl ved tilføjelse af spiller:", error);
    return null;
  }
}

// Hent alle spillere for et spil
async function getPlayersForGame(gameId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fejl ved hentning af spillere:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Uventet fejl ved hentning af spillere:", error);
    return [];
  }
}

// Funktion til at oprette et nyt spil
async function createNewGame() {
  const playerName = prompt("Indtast dit navn:", "Spiller 1");
  if (!playerName) return;

  try {
    const gameCode = generateGameCode();
    
    const { data, error } = await supabase
      .from("games")
      .insert([
        {
          game_code: gameCode,
          game_state: 'lobby',
          current_round: 1
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Fejl ved oprettelse af spil:", error);
      alert("Kunne ikke oprette spil. Prøv igen.");
      return;
    }

    // Tilføj spilleren til spillet
    const player = await addPlayerToGame(data.id, playerName);
    if (!player) {
      alert("Kunne ikke tilføje spiller. Prøv igen.");
      return;
    }

    console.log("Nyt spil oprettet:", data);
    console.log("Spiller tilføjet:", player);
    showGameLobby(data);
    
  } catch (error) {
    console.error("Uventet fejl:", error);
    alert("Der opstod en fejl. Prøv igen.");
  }
}

// Funktion til at joine et eksisterende spil
async function joinGame() {
  const input = document.querySelector("#join-code-input");
  const gameCode = input ? input.value.trim().toUpperCase() : "";

  if (!gameCode) {
    alert("Indtast venligst en spilkode");
    return;
  }

  const playerName = prompt("Indtast dit navn:", "Spiller 2");
  if (!playerName) return;

  try {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("game_code", gameCode)
      .single();

    if (error || !data) {
      alert("Spil ikke fundet. Tjek spilkoden og prøv igen.");
      return;
    }

    // Tilføj spilleren til spillet
    const player = await addPlayerToGame(data.id, playerName);
    if (!player) {
      alert("Kunne ikke deltage i spil. Prøv igen.");
      return;
    }

    console.log("Joiner spil:", data);
    console.log("Spiller tilføjet:", player);
    showGameLobby(data);

  } catch (error) {
    console.error("Fejl ved joining:", error);
    alert("Kunne ikke joine spil. Prøv igen.");
  }
}

// Vis spil lobby når man er i et spil
async function showGameLobby(gameData) {
  document.querySelector("#app").innerHTML = `
    <div class="game-lobby">
      <h1>Flamme Rouge</h1>
      <div class="game-info">
        <h2>Spil Lobby</h2>
        <div class="game-code-display">
          <h3>Spilkode: <span class="code">${gameData.game_code}</span></h3>
          <p>Del denne kode med andre spillere</p>
        </div>
        
        <div class="players-section">
          <h3>Spillere i Lobby</h3>
          <div id="players-list">
            <p>Henter spillere...</p>
          </div>
        </div>
        
        <div class="game-status">
          <p><strong>Status:</strong> ${gameData.game_state}</p>
          <p><strong>Runde:</strong> ${gameData.current_round}</p>
          <p><strong>Spil ID:</strong> ${gameData.id}</p>
        </div>

        <div class="lobby-actions">
          <button id="start-game" class="primary-btn">Start Spil</button>
          <button id="leave-game" class="secondary-btn">Forlad Spil</button>
        </div>
      </div>
    </div>
  `;

  // Indlæs spillere første gang
  await updatePlayersList(gameData.id);

  // Event listeners for lobby
  const startBtn = document.querySelector("#start-game");
  if (startBtn) startBtn.addEventListener("click", () => startGame(gameData.id));
  const leaveBtn = document.querySelector("#leave-game");
  if (leaveBtn) leaveBtn.addEventListener("click", showMainLobby);
  
  // Gem spil ID globalt for real-time opdateringer
  window.currentGameId = gameData.id;
}

// Opdater spillerlisten
async function updatePlayersList(gameId) {
  const players = await getPlayersForGame(gameId);
  
  const playersHtml = players.length > 0 
    ? players.map((player, index) => `
        <div class="player-item">
          <span class="player-number">${index + 1}</span>
          <span class="player-name">${player.name}</span>
          <span class="player-status">Online</span>
        </div>
      `).join('')
    : '<p class="no-players">Ingen spillere endnu...</p>';

  const playersListElement = document.querySelector("#players-list");
  if (playersListElement) {
    playersListElement.innerHTML = playersHtml;
  }
}

// Start spillet (opdater game_state) og naviger til in-game skærm
async function startGame(gameId) {
  console.log("startGame called for gameId:", gameId);
  try {
    // Return the updated row so we can inspect the result
    const { data, error } = await supabase
      .from("games")
      .update({ game_state: 'playing' })
      .eq("id", gameId)
      .select()
      .single();

    if (error) {
      console.error("Fejl ved start af spil:", error);
      alert("Kunne ikke starte spil. Tjek konsollen for detaljer.");
      return;
    }

    console.log("Spil opdateret, data:", data);
    alert("Spillet er startet!");

    // Naviger til in-game skærm
    try {
      showGameScreen(gameId);
      console.log('showGameScreen called');
    } catch (uiErr) {
      console.error('Fejl ved navigation til game screen:', uiErr);
      alert('Kunne ikke vise spilsiden. Se konsollen.');
    }

  } catch (error) {
    console.error("Uventet fejl ved startGame:", error);
    alert('Uventet fejl ved start af spil. Se konsollen.');
  }
}

// Vis hovedlobby
function showMainLobby() {
  document.querySelector("#app").innerHTML = `
    <div class="main-lobby">
      <h1>Flamme Rouge</h1>
      <div class="lobby-container">
        
        <div class="lobby-section">
          <h2>Start Nyt Spil</h2>
          <p>Opret et nyt spil og få en spilkode til at invitere andre</p>
          <button id="create-game" class="primary-btn">Start Nyt Spil</button>
        </div>

        <div class="lobby-divider">
          <span>ELLER</span>
        </div>

        <div class="lobby-section">
          <h2>Deltag i Spil</h2>
          <p>Indtast spilkoden du har fået fra en anden spiller</p>
          <div class="join-form">
            <input 
              type="text" 
              id="join-code-input" 
              placeholder="Indtast spilkode" 
              maxlength="6"
              style="text-transform: uppercase"
            />
            <button id="join-game" class="primary-btn">Deltag</button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Event listeners for hovedlobby
  const createBtn = document.querySelector("#create-game");
  if (createBtn) createBtn.addEventListener("click", createNewGame);
  const joinBtn = document.querySelector("#join-game");
  if (joinBtn) joinBtn.addEventListener("click", joinGame);
  
  // Auto-uppercase i input felt
  const joinInput = document.querySelector("#join-code-input");
  if (joinInput) {
    joinInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
    });

    // Enter taste i input felt
    joinInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        joinGame();
      }
    });
  }
}

// Start med hovedlobby
showMainLobby();

// Subscribe til real-time opdateringer for games og players tabellerne
const realtimeChannel = supabase
  .channel("lobby-updates")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "games" },
    (payload) => {
      console.log("Games change received!", payload);
      // Opdater UI hvis nødvendigt baseret på game ændringer
    }
  )
  .on(
    "postgres_changes", 
    { event: "*", schema: "public", table: "players" },
    (payload) => {
      console.log("Players change received!", payload);
      
      // Hvis vi er i en spil lobby og der er ændringer i spillere
      if (window.currentGameId) {
        // Opdater spillerlisten når nogen joiner/forlader
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          updatePlayersList(window.currentGameId);
        }
      }
    }
  )
  .subscribe();
