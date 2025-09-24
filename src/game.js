import "./style.css";
import supabase from "./supabase.js";

// Simple in-game screen. This is a minimal starting point for the actual game view.
// It fetches the current players and shows a placeholder for the game board.
export async function showGameScreen(gameId) {
  window.currentGameId = gameId;

  document.querySelector("#app").innerHTML = `
    <div class="game-screen">
      <header>
        <h1>Flamme Rouge — Spil</h1>
        <div class="game-meta">Spil ID: <strong>${gameId}</strong></div>
      </header>

      <section class="game-area">
        <div class="track-placeholder">
          <h2>Spilleplade (placeholder)</h2>
          <p>Her kommer den visuelle spilleplade og spil-logik.</p>
        </div>

        <aside class="players-panel">
          <h3>Spillere</h3>
          <div id="game-players">
            <p>Henter spillere...</p>
          </div>

          <div class="game-controls">
            <button id="end-turn" class="primary-btn">Afslut Tur</button>
            <button id="back-to-lobby" class="secondary-btn">Tilbage til Lobby</button>
          </div>
        </aside>
      </section>
    </div>
  `;

  // Load players once
  await updatePlayersList(gameId);

  // Event listeners
  const backBtn = document.querySelector('#back-to-lobby');
  if (backBtn) backBtn.addEventListener('click', () => {
    // Simple behaviour for now: reload page to return to main lobby
    location.reload();
  });

  const endTurnBtn = document.querySelector('#end-turn');
  if (endTurnBtn) endTurnBtn.addEventListener('click', async () => {
    // Placeholder: advance round in DB
    try {
      const { data, error } = await supabase
        .from('games')
        .select('current_round')
        .eq('id', gameId)
        .single();

      if (error || !data) {
        alert('Kunne ikke hente rundeinfo');
        return;
      }

      const nextRound = (data.current_round || 1) + 1;
      const { error: updateError } = await supabase
        .from('games')
        .update({ current_round: nextRound })
        .eq('id', gameId);

      if (updateError) {
        console.error('Fejl ved opdatering af runde:', updateError);
        alert('Kunne ikke opdatere runde');
        return;
      }

      alert('Runde afsluttet — næste runde: ' + nextRound);
    } catch (err) {
      console.error(err);
      alert('Uventet fejl');
    }
  });
}

// Hent spillere fra Supabase for et spil
async function getPlayersForGame(gameId) {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fejl ved hentning af spillere:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Uventet fejl ved hentning af spillere:', error);
    return [];
  }
}

async function updatePlayersList(gameId) {
  const players = await getPlayersForGame(gameId);

  const playersHtml = players.length > 0
    ? players.map((player, index) => `
        <div class="player-item">
          <span class="player-number">${index + 1}</span>
          <span class="player-name">${player.name}</span>
        </div>
      `).join('')
    : '<p class="no-players">Ingen spillere endnu...</p>';

  const el = document.querySelector('#game-players');
  if (el) el.innerHTML = playersHtml;
}
