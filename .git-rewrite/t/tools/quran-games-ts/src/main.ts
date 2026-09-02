import './style.css';

interface CardData {
  id: number;
  type: 'surah' | 'meaning';
  text: string;
}

const pairs: CardData[] = [
  { id: 1, type: 'surah', text: 'سورة الفيل' }, { id: 1, type: 'meaning', text: '🐘 جيش أبرهة' },
  { id: 2, type: 'surah', text: 'سورة الناس' }, { id: 2, type: 'meaning', text: '🛡️ الاستعاذة' },
  { id: 3, type: 'surah', text: 'سورة الشمس' }, { id: 3, type: 'meaning', text: '☀️ وضحاها' },
  { id: 4, type: 'surah', text: 'سورة التين' }, { id: 4, type: 'meaning', text: '🌳 والزيتون' },
  { id: 5, type: 'surah', text: 'سورة الفلق' }, { id: 5, type: 'meaning', text: '🌅 من شر ما خلق' },
  { id: 6, type: 'surah', text: 'سورة قريش' }, { id: 6, type: 'meaning', text: '🐪 الشتاء والصيف' },
];

class MemoryGame {
  private cards: CardData[] = [];
  private firstCard: HTMLElement | null = null;
  private lockBoard = false;
  private matches = 0;
  
  private gridElement: HTMLElement;
  private messageElement: HTMLElement;

  constructor() {
    this.renderApp();
    this.gridElement = document.getElementById('grid')!;
    this.messageElement = document.getElementById('message')!;
    this.initGame();
  }

  private renderApp() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
      <h1>لعبة الذاكرة: طابق السورة بمعناها</h1>
      <div id="message"></div>
      <div class="grid" id="grid"></div>
      <button id="restart-btn">إعادة اللعب</button>
    `;

    document.getElementById('restart-btn')?.addEventListener('click', () => this.initGame());
  }

  private initGame() {
    this.gridElement.innerHTML = '';
    this.messageElement.innerText = '';
    this.cards = [...pairs].sort(() => 0.5 - Math.random());
    this.firstCard = null;
    this.lockBoard = false;
    this.matches = 0;

    this.cards.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'card';
      el.dataset.id = String(item.id);
      el.dataset.index = String(index);
      el.innerHTML = '<span>❓</span>';
      el.addEventListener('click', (e) => this.flipCard(e.currentTarget as HTMLElement));
      this.gridElement.appendChild(el);
    });
  }

  private flipCard(cardElement: HTMLElement) {
    if (this.lockBoard) return;
    if (cardElement === this.firstCard) return;

    cardElement.classList.add('flipped');
    const index = parseInt(cardElement.dataset.index || '0', 10);
    const item = this.cards[index];
    cardElement.innerHTML = `<span>${item.text}</span>`;

    if (!this.firstCard) {
      this.firstCard = cardElement;
      return;
    }

    this.checkForMatch(cardElement);
  }

  private checkForMatch(secondCard: HTMLElement) {
    const isMatch = this.firstCard?.dataset.id === secondCard.dataset.id;
    isMatch ? this.disableCards(secondCard) : this.unflipCards(secondCard);
  }

  private disableCards(secondCard: HTMLElement) {
    if (!this.firstCard) return;
    
    // Disable clicks
    this.firstCard.style.pointerEvents = 'none';
    secondCard.style.pointerEvents = 'none';
    
    this.firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    
    this.resetBoard();
    this.matches++;
    
    if (this.matches === pairs.length / 2) {
      this.messageElement.innerText = '🎉 أحسنت! طابقت كل السور بنجاح!';
      try { window.parent.postMessage({ type: 'mushaf:game_win' }, '*'); } catch (e) {}
    }
  }

  private unflipCards(secondCard: HTMLElement) {
    this.lockBoard = true;
    setTimeout(() => {
      if (this.firstCard) {
        this.firstCard.classList.remove('flipped');
        this.firstCard.innerHTML = '<span>❓</span>';
      }
      secondCard.classList.remove('flipped');
      secondCard.innerHTML = '<span>❓</span>';
      
      this.resetBoard();
    }, 1000);
  }

  private resetBoard() {
    this.firstCard = null;
    this.lockBoard = false;
  }
}

// Start game
new MemoryGame();
