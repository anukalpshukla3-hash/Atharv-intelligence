'use client';

import { useState } from 'react';

const chapters = [
  { number: '01', title: 'Built by repetition', label: 'ATHLETE / CALISTHENICS', copy: 'Gym sessions, bodyweight work, and the small satisfaction of getting a little better each time. No shortcuts in this save file.' },
  { number: '02', title: 'A curious mind', label: 'STUDY / FOCUS', copy: 'Books open, questions on the page, and the patience to work through the hard bits. The next level starts with showing up.' },
  { number: '03', title: 'One more block', label: 'MINECRAFT / MAKE BELIEVE', copy: 'A mossy world of caves, forests, and half-finished builds. Somewhere to explore, reset, and make something from nothing.' },
  { number: '04', title: 'Stories that stay', label: 'ANIME / WATCHLIST', copy: 'Vinland Saga, Haimiya Senpai, and the characters that make a quiet night feel like an adventure.' },
];

export function AtharvStory() {
  const [birthdayOpen, setBirthdayOpen] = useState(false);

  return (
    <div className="story-page">
      <header className="story-nav">
        <a className="wordmark" href="#home" aria-label="Atharv Gupta home"><span className="wordmark-mark">A</span><span>ATHARV<br /><small>PERSONAL ARCHIVE</small></span></a>
        <nav aria-label="Main navigation">
          <a href="#chapters">The story</a>
          <a href="#people">The people</a>
          <a href="#birthday">June 15</a>
          <a className="nav-chat" href="#chat">Open chat <span aria-hidden="true">↗</span></a>
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
        <div className="world-art" role="img" aria-label="A quiet, mossy block-world forest at sunset">
          <div className="world-sun" />
          <div className="world-mountains mountain-back" />
          <div className="world-mountains mountain-front" />
          <div className="world-pine pine-one"><i /><i /><i /></div>
          <div className="world-pine pine-two"><i /><i /><i /></div>
          <div className="world-ground" />
          <div className="world-path" />
          <div className="world-block block-one" /><div className="world-block block-two" />
          <p className="world-caption"><span>SEED 0615</span><span>THE OVERWORLD</span></p>
          <span className="world-coord">X 015 · Z 240</span>
        </div>
        <a className="scroll-cue" href="#chapters"><span /> SCROLL TO EXPLORE</a>
      </section>

      <section className="story-note">
        <p className="eyebrow">A NOTE FROM THE OVERWORLD</p>
        <p>Some lives are best told as a collection of little things: <span>early starts, unfinished builds, good friends,</span> and stories you keep coming back to.</p>
        <span className="note-spark" aria-hidden="true">✳</span>
      </section>

      <section className="chapters-section" id="chapters">
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

      <section className="memory-strip" aria-label="MACE memory">
        <div className="memory-stamp">FROM THE<br />OLD SAVE</div>
        <p className="eyebrow">MACE ARCHIVE <span>—</span> A LITTLE NOSTALGIA</p>
        <p className="memory-title">LT3 <span>in</span> MACE</p>
        <p className="memory-foot">Some chapters are just for the people who were there.</p>
        <span className="memory-sprout" aria-hidden="true">✳</span>
      </section>

      <section className="people-section" id="people">
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
