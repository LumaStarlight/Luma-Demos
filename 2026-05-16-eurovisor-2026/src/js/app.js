(function () {
  window.EuroVisor = window.EuroVisor || {};

  window.EuroVisor.URL_BASE = "https://eurovisor.es";
  window.EuroVisor.PUNTOS_SLOTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

  window.EuroVisor.state = {
    section: "guia",
    participantes: [],
    votos: [],
    rankingGenerado: null,
    cargando: true,
  };

  // --- Utilidades ---
  function q(selector) { return document.querySelector(selector); }
  function qq(selector) { return document.querySelectorAll(selector); }

  // --- Navegación ---
  window.EuroVisor.showSection = function showSection(sectionId) {
    const sections = qq(".section");
    const tabs = qq(".nav-tab");

    sections.forEach((section) => {
      section.classList.toggle("active", section.id === sectionId);
    });

    tabs.forEach((tab) => {
      const isActive = tab.dataset.target === sectionId;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    window.EuroVisor.state.section = sectionId;
    if (sectionId === "ranking") renderRankingView();
    if (sectionId === "compartir") renderCompartir();
  };

  // --- Motor de votación ---
  window.EuroVisor.motorVotacion = {
    iniciarVotacion(participantes) {
      window.EuroVisor.state.participantes = participantes;
      window.EuroVisor.state.votos = [];
      window.EuroVisor.state.rankingGenerado = null;
    },
    agregarVoto(participanteId) {
      const votos = window.EuroVisor.state.votos;
      if (votos.length >= 10) throw new Error("Ya has seleccionado 10 países");
      if (votos.some((v) => v.participante_id === participanteId)) throw new Error("Este país ya está en tu top 10");
      votos.push({ participante_id: participanteId });
    },
    quitarVoto(participanteId) {
      const votos = window.EuroVisor.state.votos;
      const idx = votos.findIndex((v) => v.participante_id === participanteId);
      if (idx === -1) throw new Error("El país no está en tu top 10");
      votos.splice(idx, 1);
    },
    intercambiarSlots(idxA, idxB) {
      const votos = window.EuroVisor.state.votos;
      if (idxA < 0 || idxA >= votos.length || idxB < 0 || idxB >= votos.length) return;
      const tmp = votos[idxA];
      votos[idxA] = votos[idxB];
      votos[idxB] = tmp;
    },
    asignarPuntos() {
      const puntos = window.EuroVisor.PUNTOS_SLOTS;
      return window.EuroVisor.state.votos.map((v, i) => ({
        participante_id: v.participante_id,
        puntos: puntos[i] || 1,
      }));
    },
    validarVotos() {
      const votos = window.EuroVisor.state.votos;
      const errores = [];
      if (votos.length < 10) errores.push(`Faltan ${10 - votos.length} países`);
      if (votos.length > 10) errores.push(`Sobran ${votos.length - 10} países`);
      const ids = votos.map((v) => v.participante_id);
      const unicos = new Set(ids);
      if (unicos.size !== ids.length) errores.push("Hay países duplicados");
      return { valido: votos.length === 10 && unicos.size === ids.length, errores };
    },
    generarRanking() {
      const participantes = window.EuroVisor.state.participantes;
      const votosConPuntos = this.asignarPuntos();
      const ranking = votosConPuntos.map((v, i) => {
        const p = participantes.find((x) => x.id === v.participante_id);
        return {
          posicion: i + 1,
          pais: p ? p.pais : "Desconocido",
          bandera: p ? p.bandera : "🏳️",
          artista: p ? p.artista : "",
          cancion: p ? p.cancion : "",
          puntos: v.puntos,
        };
      });
      window.EuroVisor.state.rankingGenerado = ranking;
      return ranking;
    },
    resetVotacion() {
      window.EuroVisor.state.votos = [];
      window.EuroVisor.state.rankingGenerado = null;
    },
  };

  // --- Renderizado de participantes (grid) ---
  function renderParticipantesGrid(containerId, selectable) {
    const container = q(containerId);
    const participantes = window.EuroVisor.state.participantes;
    if (!participantes.length) {
      container.innerHTML = `<p class="col-span-full text-slate-400">No hay datos de participantes.</p>`;
      return;
    }
    const votos = window.EuroVisor.state.votos;
    const enTop = new Set(votos.map((v) => v.participante_id));

    container.innerHTML = participantes.map((p, i) => {
      const seleccionado = enTop.has(p.id);
      const oddText = p.odds_ganador ? `Cuota: ${p.odds_ganador}×` : "N/A";
      const delay = Math.min(i * 40, 800);
      return `
        <div class="participante-card ${seleccionado ? "seleccionado" : ""} ${selectable ? "selectable" : ""} rounded-xl border border-white/10 bg-slate-900/60 p-4 transition-transform hover:scale-[1.02] hover:shadow-lg cursor-default"
          style="animation: card-in 400ms ease ${delay}ms both;"
          data-id="${p.id}"
          title="${selectable ? (seleccionado ? "Quitar del top 10" : "Añadir al top 10") : ""}"
        >
          <div class="flex items-center gap-2">
            <span class="text-2xl emoji">${p.bandera}</span>
            <div>
              <p class="font-semibold text-white">${p.pais}</p>
              <p class="text-xs text-slate-400">${p.artista}</p>
            </div>
          </div>
          <p class="mt-2 text-sm text-slate-300 truncate" title="${p.cancion}">${p.cancion}</p>
          <p class="mt-1 text-xs text-cyan-300">${oddText}</p>
          ${seleccionado ? `<span class="mt-2 inline-block rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">Top 10</span>` : ""}
        </div>
      `;
    }).join("");

    if (selectable) {
      container.querySelectorAll(".participante-card.selectable").forEach((card) => {
        card.addEventListener("click", () => toggleVoto(card.dataset.id));
      });
    }
  }

  // --- UI de votación ---
  function toggleVoto(id) {
    const motor = window.EuroVisor.motorVotacion;
    const enTop = window.EuroVisor.state.votos.some((v) => v.participante_id === id);
    try {
      if (enTop) motor.quitarVoto(id);
      else motor.agregarVoto(id);
    } catch (e) {
      mostrarErrorVotacion(e.message);
      return;
    }
    mostrarErrorVotacion("");
    renderVotacion();
  }

  function mostrarErrorVotacion(msg) {
    const el = q("#errores-votacion");
    if (!el) return;
    if (!msg) { el.classList.add("hidden"); el.textContent = ""; return; }
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function renderSlots() {
    const ol = q("#top10-slots");
    const votos = window.EuroVisor.state.votos;
    const participantes = window.EuroVisor.state.participantes;
    const puntos = window.EuroVisor.PUNTOS_SLOTS;
    ol.innerHTML = "";
    for (let i = 0; i < 10; i++) {
      const v = votos[i];
      const p = v ? participantes.find((x) => x.id === v.participante_id) : null;
      const li = document.createElement("li");
      li.className = "flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2";
      li.dataset.index = i;
      if (p) {
        li.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">${puntos[i]}</span>
            <span class="emoji text-lg">${p.bandera}</span>
            <span class="text-sm font-medium">${p.pais}</span>
          </div>
          <button type="button" class="quitar-slot text-red-400 hover:text-red-300 text-sm" data-id="${p.id}" title="Quitar">✕</button>
        `;
        li.querySelector(".quitar-slot").addEventListener("click", (e) => {
          e.stopPropagation();
          toggleVoto(p.id);
        });
      } else {
        li.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-400">${puntos[i]}</span>
            <span class="text-sm text-slate-500">Selecciona un país</span>
          </div>
        `;
      }
      // click-to-move para reordenar
      li.addEventListener("click", () => handleSlotClick(i));
      ol.appendChild(li);
    }

    const contador = q("#contador-votos");
    const btn = q("#btn-ver-ranking");
    const ok = votos.length === 10;
    contador.textContent = ok ? `✅ ${votos.length}/10 países en tu top` : `⚠️ ${votos.length}/10 países`;
    if (ok) {
      btn.disabled = false;
      btn.classList.remove("opacity-50", "cursor-not-allowed");
    } else {
      btn.disabled = true;
      btn.classList.add("opacity-50", "cursor-not-allowed");
    }
  }

  let selectedSlotIndex = -1;
  function handleSlotClick(index) {
    const votos = window.EuroVisor.state.votos;
    if (index >= votos.length) return;
    if (selectedSlotIndex === -1) {
      selectedSlotIndex = index;
      const lis = q("#top10-slots").children;
      if (lis[index]) lis[index].classList.add("ring-2", "ring-cyan-400", "rounded-lg");
    } else {
      window.EuroVisor.motorVotacion.intercambiarSlots(selectedSlotIndex, index);
      const lis = q("#top10-slots").children;
      if (lis[selectedSlotIndex]) lis[selectedSlotIndex].classList.remove("ring-2", "ring-cyan-400", "rounded-lg");
      selectedSlotIndex = -1;
      renderVotacion();
    }
  }

  function renderVotacion() {
    renderParticipantesGrid("#votacion-grid", true);
    renderSlots();
  }

  function irARanking() {
    const motor = window.EuroVisor.motorVotacion;
    const val = motor.validarVotos();
    if (!val.valido) {
      mostrarErrorVotacion(val.errores.join(". "));
      return;
    }
    motor.generarRanking();
    window.EuroVisor.showSection("ranking");
  }

  // --- Ranking view ---
  function renderRankingView() {
    const container = q("#ranking-content");
    const ranking = window.EuroVisor.state.rankingGenerado;
    if (!ranking) {
      container.innerHTML = `<p class="text-slate-300">Primero tienes que votar. <button type="button" class="underline text-cyan-300" onclick="EuroVisor.showSection('votacion')">Ir a votar →</button></p>`;
      return;
    }
    const medallas = ["🥇", "🥈", "🥉"];
    container.innerHTML = `
      <div class="max-w-2xl space-y-2">
        ${ranking.map((r, i) => `
          <div class="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3" style="animation: card-in 400ms ease ${Math.min(i*60,600)}ms both;">
            <div class="w-8 text-center text-lg font-bold">${i < 3 ? medallas[i] : (i + 1)}</div>
            <span class="text-2xl emoji">${r.bandera}</span>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-white truncate">${r.pais}</p>
              <p class="text-xs text-slate-400 truncate">${r.artista} — ${r.cancion}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-black text-cyan-300">${r.puntos}</p>
              <p class="text-xs text-slate-500">puntos</p>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" id="btn-rehacer" class="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600">Rehacer votación</button>
        <button type="button" onclick="EuroVisor.showSection('compartir')" class="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500">Compartir mi ranking</button>
      </div>
    `;
    q("#btn-rehacer").addEventListener("click", () => {
      window.EuroVisor.motorVotacion.resetVotacion();
      window.EuroVisor.showSection("votacion");
      renderVotacion();
    });
  }

  // --- Compartir ---
  function renderCompartir() {
    const container = q("#compartir-content");
    const ranking = window.EuroVisor.state.rankingGenerado;
    if (!ranking) {
      container.innerHTML = `<p class="text-slate-300">Aún no has creado tu ranking. Vota primero para generar un resumen compartible.</p>`;
      return;
    }
    const top3 = ranking.slice(0, 3);
    const medallas = ["🥇", "🥈", "🥉"];
    const texto = `🎤 Mi Top 3 Eurovisión 2026:\n` +
      top3.map((r, i) => `${medallas[i]} ${r.pais} — ${r.puntos} pts`).join("\n") +
      `\n¿El tuyo? → ${window.EuroVisor.URL_BASE}\n\n#Eurovision2026 #EuroVisor`;

    container.innerHTML = `
      <div class="rounded-xl border border-white/10 bg-slate-900/60 p-5">
        <h3 class="font-bold text-cyan-300 mb-2">Texto generado</h3>
        <pre class="whitespace-pre-wrap text-sm text-slate-200 bg-slate-950/60 p-3 rounded-lg border border-white/5">${texto.replace(/</g, "&lt;")}</pre>
        <div class="mt-4 flex flex-wrap gap-3">
          <a class="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-400" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Compartir en X</a>
          <a class="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">WhatsApp</a>
          <button type="button" id="btn-copiar" class="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600">Copiar texto</button>
        </div>
        <p id="copiado-feedback" class="mt-2 text-sm text-green-400 hidden">¡Copiado!</p>
      </div>
    `;
    q("#btn-copiar").addEventListener("click", () => {
      copiarTexto(texto);
    });
  }

  async function copiarTexto(texto) {
    const feedback = q("#copiado-feedback");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const ta = document.createElement("textarea");
        ta.value = texto;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      if (feedback) {
        feedback.classList.remove("hidden");
        setTimeout(() => feedback.classList.add("hidden"), 2000);
      }
    } catch (e) {
      console.error("Error al copiar:", e);
    }
  }

  // --- Favoritos ---
  function renderFavoritos() {
    const tbody = q("#favoritos-body");
    const participantes = window.EuroVisor.state.participantes;
    const conOdds = participantes
      .filter((p) => typeof p.odds_ganador === "number")
      .sort((a, b) => a.odds_ganador - b.odds_ganador)
      .slice(0, 10);

    const medallas = ["🥇", "🥈", "🥉"];
    tbody.innerHTML = conOdds.map((p, i) => {
      const prob = ((1 / p.odds_ganador) * 100).toFixed(1);
      return `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td class="py-2 pr-4 font-bold">${i < 3 ? medallas[i] : (i + 1)}</td>
          <td class="py-2 pr-4"><span class="emoji mr-1">${p.bandera}</span>${p.pais}</td>
          <td class="py-2 pr-4 text-slate-300">${p.artista}</td>
          <td class="py-2 pr-4 text-cyan-300">${p.odds_ganador}×</td>
          <td class="py-2">${prob}%</td>
        </tr>
      `;
    }).join("");
  }

  // --- Carga inicial ---
  async function cargarDatos() {
    try {
      const res = await fetch("src/data/participantes.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      window.EuroVisor.state.participantes = data;
      window.EuroVisor.motorVotacion.iniciarVotacion(data);
      renderParticipantesGrid("#participantes-grid", false);
      renderVotacion();
      renderFavoritos();
      window.EuroVisor.state.cargando = false;
    } catch (err) {
      console.error("Error cargando participantes:", err);
      q("#participantes-grid").innerHTML = `<p class="col-span-full text-red-400">Error al cargar participantes. Revisa la consola.</p>`;
      q("#votacion-grid").innerHTML = `<p class="col-span-full text-red-400">Error al cargar participantes.</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    qq(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        window.EuroVisor.showSection(tab.dataset.target);
      });
    });

    q("#btn-ver-ranking")?.addEventListener("click", irARanking);

    cargarDatos();
  });

  console.log("EuroVisor 2026 — cargado");
})();
