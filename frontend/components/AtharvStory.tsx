'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const chapters = [
  { number: '01', title: 'Built by repetition', label: 'ATHLETE / CALISTHENICS', copy: 'Gym sessions, bodyweight work, and the small satisfaction of getting a little better each time. No shortcuts in this save file.' },
  { number: '02', title: 'A curious mind', label: 'STUDY / FOCUS', copy: 'Books open, questions on the page, and the patience to work through the hard bits. The next level starts with showing up.' },
  { number: '03', title: 'One more block', label: 'OAKPEARL / UNSTABLE SMP', copy: 'Oakpearl’s corner of the Unstable SMP: mossy caves, forest routes, and the freedom to make a world one block at a time.' },
  { number: '04', title: 'Stories that stay', label: 'ANIME / WATCHLIST', copy: 'Vinland Saga, Haimiya Senpai, and the characters that make a quiet night feel like an adventure.' },
];

export function AtharvStory() {
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [biome, setBiome] = useState<'forest' | 'cave' | 'taiga'>('forest');
  const [worldEntered, setWorldEntered] = useState(false);
  const [worldView, setWorldView] = useState<'shore' | 'home' | 'cave'>('shore');
  const [musicOpen, setMusicOpen] = useState(false);
  const [album, setAlbum] = useState<'beta' | 'alpha'>('beta');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((target, index) => {
      target.style.setProperty('--reveal-delay', `${(index % 4) * 90}ms`);
      observer.observe(target);
    });
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('motion-ready');
    };
  }, []);

  return (
    <div className="story-page">
      <header className="story-nav">
        <a className="wordmark" href="#home" aria-label="Atharv Gupta home"><span className="wordmark-mark">A</span><span>ATHARV<br /><small>PERSONAL ARCHIVE</small></span></a>
        <nav aria-label="Main navigation">
          <a href="#chapters">The story</a>
          <a href="#people">The people</a>
          <a href="#birthday">June 15</a>
        </nav>
      </header>

      <section className="story-hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-square" /> A little world by Atharv Gupta</p>
          <h1>Atharv<br /><em>Gupta</em><span className="hero-period">.</span></h1>
          <p className="hero-intro">Athlete. Student. Builder of blocky worlds.<br />Still finding out what the next chapter looks like.</p>
          <div className="hero-actions">
            <a className="button button-light" href="#chapters">Walk through the story <span aria-hidden="true">↓</span></a>
            <a className="text-link" href="#chat">Leave a message <span aria-hidden="true">↗</span></a>
          </div>
          <p className="hero-index">PERSONAL ARCHIVE <span>—</span> 2026</p>
        </div>
        <div className={`world-art biome-${biome}${worldEntered ? ' world-entered' : ''} view-${worldView}`} role="group" aria-label="Oakpearl’s Minecraft-inspired world">
          <div className="world-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="world-sun" />
          <div className="world-horizon" aria-hidden="true" />
          <div className="voxel-ridge ridge-far" aria-hidden="true" /><div className="voxel-ridge ridge-mid" aria-hidden="true" />
          <div className="voxel-island island-left" aria-hidden="true" /><div className="voxel-island island-right" aria-hidden="true" />
          <div className="world-water" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="world-shore" aria-hidden="true" />
          <div className="voxel-cabin" aria-hidden="true"><i className="cabin-wall" /><i className="cabin-roof" /><i className="cabin-door" /><i className="cabin-window window-left" /><i className="cabin-window window-right" /><i className="cabin-chimney" /></div>
          <div className="voxel-tree tree-a" aria-hidden="true"><i /><i /><i /><b /></div>
          <div className="voxel-tree tree-b" aria-hidden="true"><i /><i /><i /><b /></div>
          <div className="voxel-tree tree-c" aria-hidden="true"><i /><i /><i /><b /></div>
          <div className="voxel-tree tree-d" aria-hidden="true"><i /><i /><i /><b /></div>
          <div className="world-moon" />
          <div className="world-mountains mountain-back" />
          <div className="world-mountains mountain-front" />
          <div className="world-pine pine-one"><i /><i /><i /></div>
          <div className="world-pine pine-two"><i /><i /><i /></div>
          <div className="world-cave" />
          <div className="world-ground" />
          <div className="world-steps steps-a" aria-hidden="true" /><div className="world-steps steps-b" aria-hidden="true" />
          <div className="voxel-flowers flowers-a" aria-hidden="true">✳　✳　✳</div>
          <div className="world-path" />
          <div className="world-block block-one" /><div className="world-block block-two" />
          <span className="world-coord">OAKPEARL <i /> UNSTABLE SMP</span>
          <div className="world-hud">
            {!worldEntered ? <button className="enter-world" type="button" onClick={() => setWorldEntered(true)}>ENTER OAKPEARL’S WORLD <span aria-hidden="true">↗</span></button> : <div className="world-view-picker" role="group" aria-label="Choose a world viewpoint"><span>VIEWPOINT</span>{(['shore', 'home', 'cave'] as const).map((view) => <button type="button" key={view} onClick={() => setWorldView(view)} aria-pressed={worldView === view}>{view === 'shore' ? 'SHORE' : view === 'home' ? 'CABIN' : 'CAVE'}</button>)}</div>}
            <div className="biome-picker" role="group" aria-label="Choose a world biome">
              {(['forest', 'cave', 'taiga'] as const).map((option) => (
                <button type="button" key={option} onClick={() => setBiome(option)} aria-pressed={biome === option}>
                  {option === 'forest' ? 'FOREST' : option === 'cave' ? 'MOSS CAVE' : 'TAIGA'}
                </button>
              ))}
            </div>
            <div className="world-hotbar" aria-hidden="true">
              {['grass', 'moss', 'oak', 'stone', 'fern', 'dirt', 'leaf', 'gold', 'water'].map((block, index) => (
                <span className={`hotbar-slot slot-${block}${index === 0 ? ' selected' : ''}`} key={block} />
              ))}
            </div>
          </div>
          <p className="world-caption"><span>OAKPEARL’S OVERWORLD <i /> UNSTABLE SMP</span><span>{worldView === 'cave' || biome === 'cave' ? 'MOSS CAVERN' : worldView === 'home' ? 'THE CABIN BY THE SHORE' : biome === 'taiga' ? 'TAIGA EDGE' : 'SEED 0615 · THE OVERWORLD'}</span></p>
        </div>
        <a className="scroll-cue" href="#chapters"><span /> SCROLL TO EXPLORE</a>
      </section>

      <section className="story-note" data-reveal>
        <p className="eyebrow">A NOTE FROM THE OVERWORLD</p>
        <p>Some lives are best told as a collection of little things: <span>early starts, unfinished builds, good friends,</span> and stories you keep coming back to.</p>
        <span className="note-spark" aria-hidden="true">✳</span>
      </section>

      <section className="archive-section" id="field-notes" data-reveal>
        <div className="archive-heading">
          <div><p className="eyebrow">FIELD NOTES <span>—</span> CAMERA ROLL</p><h2>A life between<br /><em>sets and save files.</em></h2></div>
          <p className="section-aside">Small snapshots from Atharv’s world, kept in the same archive as the stories.</p>
        </div>
        <div className="archive-grid">
          <figure className="archive-photo portrait-photo">
            <Image src="/images/atharv-portrait.svg" alt="Atharv Gupta, in a casual portrait" fill sizes="(max-width: 700px) 100vw, 46vw" unoptimized />
            <figcaption><span>01 / THE PERSON BEHIND THE SAVE</span><strong>Atharv, out of game.</strong></figcaption>
          </figure>
          <figure className="archive-photo training-photo">
            <div className="training-visual" role="img" aria-label="A block-world illustration of a barbell and calisthenics rings">
              <span className="training-ring ring-left" /><span className="training-ring ring-right" />
              <span className="training-bar"><i /><i /><i /><i /></span>
              <span className="training-mark">01</span>
            </div>
            <figcaption><span>02 / TRAINING LOG</span><strong>Show up. Put in the reps.</strong></figcaption>
          </figure>
          <div className="archive-side-note">
            <span className="pixel-heart" aria-hidden="true">♥</span>
            <p className="eyebrow">REAL LIFE / REAL PROGRESS</p>
            <p>Calisthenics, gym days, and steady practice. His progress is his own story, one session at a time.</p>
            <span className="archive-coord">OAKPEARL’S JOURNAL · 01</span>
          </div>
        </div>
      </section>

      <section className="chapters-section" id="chapters" data-reveal>
        <div className="section-heading">
          <div><p className="eyebrow">THE FIELD GUIDE <span>—</span> 01 / 04</p><h2>Different worlds.<br /><em>Same curiosity.</em></h2></div>
          <p className="section-aside">A few things that make this world feel like his.</p>
        </div>
        <div className="chapter-grid">
          {chapters.map((chapter) => (
            <article className="chapter-card" key={chapter.number}>
              <div className={`chapter-art chapter-art-${chapter.number}`} aria-hidden="true">
                {chapter.number === '01' && <><span className="art-ring" /><span className="art-line" /><span className="art-label">KEEP<br />GOING</span></>}
                {chapter.number === '02' && <><span className="art-book" /><span className="art-star">✳</span><span className="art-label">STAY<br />CURIOUS</span></>}
                {chapter.number === '03' && <><span className="art-tree" /><span className="art-pixel pixel-a" /><span className="art-pixel pixel-b" /><span className="art-label">BUILD<br />YOUR<br />WORLD</span></>}
                {chapter.number === '04' && <><span className="art-frame" /><span className="art-sun" /><span className="art-label">STORIES<br />TO KEEP</span></>}
                <span className="chapter-number">{chapter.number}</span>
              </div>
              <p className="eyebrow chapter-label">{chapter.label}</p>
              <h3>{chapter.title}</h3>
              <p className="chapter-copy">{chapter.copy}</p>
              {chapter.number === '04' && (
                <div className="chapter-links" aria-label="Official manga pages">
                  <a href="https://www.manga-up.com/titles/1626" target="_blank" rel="noopener noreferrer">HAIMIYA-SENPAI <span aria-hidden="true">↗</span></a>
                  <a href="https://kodansha.us/series/vinland-saga/" target="_blank" rel="noopener noreferrer">VINLAND SAGA <span aria-hidden="true">↗</span></a>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="memory-strip" aria-label="MACE memory" data-reveal>
        <div className="memory-stamp">FROM THE<br />OLD SAVE</div>
        <p className="eyebrow">MACE ARCHIVE <span>—</span> A LITTLE NOSTALGIA</p>
        <p className="memory-title">LT3 <span>in</span> MACE</p>
        <p className="memory-foot">Some chapters are just for the people who were there.</p>
        <span className="memory-sprout" aria-hidden="true">✳</span>
      </section>

      <section className="people-section" id="people" data-reveal>
        <div className="section-heading people-heading">
          <div><p className="eyebrow">THE PEOPLE WHO INSPIRE HIM <span>—</span> 02</p><h2>Good people.<br /><em>Good influence.</em></h2></div>
          <p className="section-aside">The best stories are never solo runs.</p>
        </div>
        <div className="people-grid">
          <article className="person-card friend-card">
            <span className="person-index">01 / BEST FRIEND</span>
            <span className="person-flower" aria-hidden="true">✳</span>
            <p className="garden-type">Anukalp</p>
            <p className="person-caption">The friend who makes the side quests count.</p>
            <span className="person-rule" />
            <p className="person-label">BEST FRIEND <span>↗</span></p>
          </article>
          <article className="person-card idol-card">
            <span className="person-index">02 / STYLE NOTES</span>
            <span className="person-flower" aria-hidden="true">✳</span>
            <p className="garden-type">Jordan<br />Barrett</p>
            <p className="person-caption">A style reference worth keeping on the moodboard.</p>
            <span className="person-rule" />
            <p className="person-label">IDOL <span>↗</span></p>
          </article>
          <article className="person-card vmogsu-card">
            <span className="person-index">03 / DAILY INSPIRATION</span>
            <span className="person-flower" aria-hidden="true">✳</span>
            <p className="garden-type">vmogsu</p>
            <p className="person-caption">Another name on the list of people who push him forward.</p>
            <span className="person-rule" />
            <p className="person-label">IDOL <span>↗</span></p>
          </article>
        </div>
        <p className="type-note">TYPE GARDEN <span>✳</span> a little inspiration for the people who matter</p>
      </section>

      <section className="soundtrack-section" id="soundtrack" data-reveal>
        <div className="soundtrack-copy">
          <p className="eyebrow">THE AMBIENT SOUNDTRACK <span>—</span> C418</p>
          <h2>Build a little.<br /><em>Listen a while.</em></h2>
          <p>Pick a soundtrack from the Overworld. “Dreiton” lives on <i>Minecraft — Volume Beta</i>; the Alpha album holds more familiar C418 worlds.</p>
          <div className="album-switch" role="group" aria-label="Choose a C418 album">
            <button type="button" className={album === 'beta' ? 'active' : ''} onClick={() => { setAlbum('beta'); setMusicOpen(true); }} aria-pressed={album === 'beta'}>VOLUME BETA <span>· DREITON</span></button>
            <button type="button" className={album === 'alpha' ? 'active' : ''} onClick={() => { setAlbum('alpha'); setMusicOpen(true); }} aria-pressed={album === 'alpha'}>VOLUME ALPHA <span>· MINECRAFT OST</span></button>
          </div>
          <button className="button soundtrack-toggle" type="button" onClick={() => setMusicOpen((open) => !open)} aria-expanded={musicOpen}>
            {musicOpen ? 'Hide Spotify player' : 'Open Spotify player'} <span aria-hidden="true">{musicOpen ? '−' : '↗'}</span>
          </button>
          <p className="music-note">Nothing plays until you press play in Spotify.</p>
        </div>
        <div className="soundtrack-art" aria-hidden="true">
          <span className="soundtrack-disc"><i /></span>
          <span className="soundtrack-label">C418<br />SIDE A</span>
          <span className="soundtrack-caption">MUSIC FOR THE LONG WAY HOME</span>
        </div>
        {musicOpen && <div className="spotify-frame">
          <iframe
            key={album}
            title={album === 'beta' ? 'C418 Minecraft Volume Beta on Spotify, including Dreiton' : 'C418 Minecraft Volume Alpha on Spotify'}
            src={album === 'beta' ? 'https://open.spotify.com/embed/album/7CYDRyFCKtAYJBSpfovLyX?utm_source=generator' : 'https://open.spotify.com/embed/album/3Gt7rOjcZQoHCfnKl5AkK7?utm_source=generator'}
            width="100%"
            height="352"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>}
      </section>

      <section className="birthday-section" id="birthday">
        <div className="birthday-copy">
          <p className="eyebrow">MARK THE CALENDAR <span>—</span> 03</p>
          <h2>June <em>15.</em></h2>
          <p>A once-a-year checkpoint for the main character. Leave a little good energy for the next trip around the sun.</p>
          <button className="button button-dark" type="button" onClick={() => setBirthdayOpen((open) => !open)} aria-expanded={birthdayOpen}>
            {birthdayOpen ? 'Close the card' : 'Open the birthday card'} <span aria-hidden="true">{birthdayOpen ? '−' : '↗'}</span>
          </button>
          {birthdayOpen && <p className="birthday-reveal" role="status">Happy birthday, Atharv. May this next chapter have good people, big builds, and plenty of reasons to keep going. ✳</p>}
        </div>
        <div className="birthday-art" aria-hidden="true"><span className="birthday-sun" /><span className="birthday-big">15</span><span className="birthday-small">JUNE<br />EVERY YEAR</span><span className="birthday-leaf leaf-a">✳</span><span className="birthday-leaf leaf-b">✳</span></div>
      </section>

      <footer className="story-footer">
        <a className="wordmark footer-mark" href="#home"><span className="wordmark-mark">A</span><span>ATHARV<br /><small>END OF THE TRAIL / FOR NOW</small></span></a>
        <p>Made for Atharv Gupta <span>✳</span> Keep exploring.</p>
        <a href="#chat">Say hello <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  );
}

