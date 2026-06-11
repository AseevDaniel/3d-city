// ── Portfolio City: all content (from Danylo's CV) ──────────────────────────
// Plain script: exposes window.CITY_DATA for both the 3D scene and the panels.

window.CITY_DATA = {
  person: {
    name: 'DANYLO ASIEIEV',
    role: 'Full-Stack Developer · React / Next.js / Node.js',
    location: 'Torrevieja, Spain',
  },

  sections: {
    about: {
      id: 'about',
      title: 'About Me',
      chip: 'HQ',
      color: '#e8442e',
      tagline: 'Full-Stack Developer · 6+ years',
      html: `
        <p class="lead">Full-Stack Developer with <b>6+ years</b> of experience building products across
        restaurant tech, healthcare booking, e-commerce, AI education, corporate websites and
        creator-economy platforms.</p>
        <p>I've worked both as a <b>sole developer</b> and as a <b>project / tech lead</b>, taking products from
        design or raw MVP stage to production — booking systems, subscription platforms, SEO-focused
        websites, CMS-driven storefronts, admin panels, real-time messaging and payment flows.</p>
        <p>I focus on scalable products with clear architecture, strong SEO and maintainable business
        logic. Alongside hands-on development I contribute through <b>mentoring, task planning, code
        reviews and performance optimization</b> — helping teams move faster while keeping the product
        stable and ready to grow.</p>
        <div class="fact-row">
          <div class="fact"><span>6+</span>years of experience</div>
          <div class="fact"><span>20K+</span>users on a platform built from scratch</div>
          <div class="fact"><span>90+</span>Lighthouse / SEO scores</div>
        </div>
        <h4>Education</h4>
        <ul>
          <li>Master's in Computer Engineering (2022 – 2025)</li>
          <li>Bachelor's in Computer Engineering (2018 – 2022)</li>
        </ul>
        <h4>Languages</h4>
        <ul><li>English — Upper-Intermediate</li><li>Ukrainian — Native</li></ul>`,
    },

    skills: {
      id: 'skills',
      title: 'Skills',
      chip: 'TECH PARK',
      color: '#2a6fdb',
      tagline: 'The full stack, floor by floor',
      groups: [
        { name: 'Frontend', items: ['JavaScript','TypeScript','React','Next.js','Redux','React Router','Formik','Vue.js','Vuex','Vuetify','AngularJS','TailwindCSS','Bootstrap','Three.js','Chart.js','Storybook','Figma','HTML5','CSS3','SCSS / Sass','jQuery'] },
        { name: 'Backend', items: ['Node.js','Express.js','Nest.js','REST API','GraphQL','Apollo','Swagger','OAuth 2.0','JWT','WebSockets'] },
        { name: 'Databases', items: ['PostgreSQL','MySQL','MongoDB','Redis','Firebase Firestore','Strapi'] },
        { name: 'Tools & Workflow', items: ['Git','GitHub / GitLab / Bitbucket','CI/CD','Docker','Docker Compose','Webpack','Vite','esbuild','Vercel','Heroku','Firebase','Jira','Agile / Scrum','Performance Optimization','API Design','Auth & Security (OAuth 2.0, OWASP)','Clean Code & Refactoring'] },
      ],
    },

    contacts: {
      id: 'contacts',
      title: 'Contacts',
      chip: 'COMMS TOWER',
      color: '#1f8a5b',
      tagline: 'All lines are open',
      links: [
        { label: 'Email',    value: 'aseev.doonel@gmail.com', href: 'mailto:aseev.doonel@gmail.com', icon: 'mail' },
        { label: 'GitHub',   value: 'github.com/AseevDaniel', href: 'https://github.com/AseevDaniel', icon: 'github' },
        { label: 'LinkedIn', value: 'danylo-asieiev', href: 'https://www.linkedin.com/in/danylo-asieiev-30a439188/', icon: 'linkedin' },
        { label: 'Telegram', value: '@doone_l', href: 'https://t.me/doone_l', icon: 'telegram' },
        { label: 'Phone',    value: '+34 632 237 252', href: 'tel:+34632237252', icon: 'phone' },
        { label: 'Location', value: 'Torrevieja, Spain', href: null, icon: 'pin' },
      ],
    },
  },

  projects: [
    {
      id: 'flylink',
      title: 'FlyLink',
      sign: 'FlyLink',
      company: 'GenAI.works · 2024 – Present',
      kind: 'Creator–Brand Collaboration Platform',
      color: '#7a5ae0',
      bullets: [
        'Built the full creator–brand collaboration flow, shipping a functional MVP in <b>3 weeks</b>',
        'Developed calendar slot booking, reducing manual scheduling effort by <b>~34%</b>',
        'Implemented real-time messaging and updates, improving response speed in active deals by <b>~21%</b>',
        'Integrated Stripe payments and platform-fee logic, reducing payment-handling friction by <b>~18%</b>',
      ],
      tech: ['React','Next.js','Tailwind CSS','NestJS','PostgreSQL','Stripe','WebSockets','Apify'],
    },
    {
      id: 'academy',
      title: 'Academy',
      sign: 'Academy',
      company: 'GenAI.works · 2024 – Present',
      kind: 'AI Learning Platform',
      color: '#e8a13a',
      bullets: [
        'Built the platform <b>from scratch</b>, scaling it to <b>20K+ users</b> and 1K+ monthly active users',
        'Optimized backend queries, improving average page load speed by <b>~70%</b>',
        'Maintained <b>90+ SEO scores</b> across the platform, supporting steady organic growth',
        'Launched paid subscriptions with Stripe, turning the product into a scalable revenue stream',
      ],
      tech: ['React','Next.js','SCSS','Node.js','Strapi','MySQL','Knex','Redis','Stripe'],
    },
    {
      id: 'genai',
      title: 'GenAI.works',
      sign: 'GenAI',
      company: 'GenAI.works · 2024 – Present',
      kind: 'Corporate Website & Product Catalog',
      color: '#2aa9b8',
      bullets: [
        'Redesigned the AI tools catalog, cutting load time on key pages by <b>50%</b>',
        'Built hackathon pages, helping launch the event section on a tight timeline',
        'Introduced a site-wide animation system, later adopted as the UI standard',
        'Contributed to <b>90%+</b> of current pages through new builds and refinements',
      ],
      tech: ['React','Next.js','SCSS','Node.js','Strapi','Knex','MySQL','Redis'],
    },
    {
      id: 'panda',
      title: 'Panda London',
      sign: 'Panda',
      company: 'NIX Solutions · 2020 – 2024',
      kind: 'E-commerce Platform',
      color: '#2f3640',
      bullets: [
        'Rebuilt the platform from legacy PHP/JS to React, reducing page maintenance effort by <b>35%</b>',
        'Delivered core flows — catalog, PDP, cart, checkout, account — improving task completion by <b>22%</b>',
        'Built a CMS-driven page builder with reusable WordPress blocks, cutting page launch time by <b>60%</b>',
        'Achieved <b>90+ Lighthouse scores</b> across all key metrics (SEO + performance)',
      ],
      tech: ['React','MobX','TypeScript','SCSS','PostCSS','WordPress','PHP'],
    },
    {
      id: 'medbook',
      title: 'MedBooking',
      sign: 'MedBook',
      company: 'NIX Solutions · 2020 – 2024',
      kind: 'Medical Booking Platform',
      color: '#d94f70',
      bullets: [
        'Built a calendar-based booking flow, reducing scheduling errors by <b>25%</b>',
        'Implemented multi-timezone slot logic, improving booking accuracy for cross-region users by <b>30%</b>',
        'Developed configurable procedure flows, cutting setup effort for new booking types by <b>40%</b>',
        'Delivered a stable appointment UI: completion rate <b>+18%</b>, less user friction',
      ],
      tech: ['React','Redux','RTK','TypeScript','Tailwind','.NET (backend)'],
    },
    {
      id: 'ruddy',
      title: 'Ruddy',
      sign: 'Ruddy',
      company: 'Ruddy · 2020',
      kind: 'Restaurant Tech — Web & Mobile',
      color: '#c0392b',
      bullets: [
        'Delivered a full web + mobile product <b>independently</b> as the sole frontend developer',
        'Built ingredient-based filtering and comparison, reducing product discovery time by <b>30–40%</b>',
        'Improved menu usability with map-based browsing, dietary filters, detailed dish views',
        'Developed a restaurant admin panel that reduced menu setup effort by <b>25–35%</b>',
      ],
      tech: ['Vue 2','Ionic','Cordova','.NET (backend)'],
    },
  ],

  fun: {
    arcade: {
      id: 'arcade',
      title: 'Bug Arcade',
      chip: 'INSERT COIN',
      color: '#e8442e',
      tagline: 'Smash the bugs before they reach production',
    },
    cafe: {
      id: 'cafe',
      title: 'Dev Café',
      chip: 'OPEN 24/7',
      color: '#8a5a3b',
      tagline: 'Where the city ships from',
      facts: [
        { k: 'MVP speed record', v: 'Full collaboration platform shipped in 3 weeks' },
        { k: 'Favorite order', v: 'Coffee + clean architecture, no sugar' },
        { k: 'Page loads', v: 'Made them ~70% faster. The café approves' },
        { k: 'Team play', v: 'Mentoring, code reviews & task planning happen at this table' },
        { k: 'Side quest', v: 'This whole city is built with Three.js — one of my stack tools' },
      ],
    },
    cinema: {
      id: 'cinema',
      title: 'City Cinema',
      chip: 'NOW SHOWING',
      color: '#5b3ba8',
      tagline: 'Tonight\u2019s premieres',
      posters: [
        { title: 'The Merge Conflict', sub: 'A drama in 3 branches', rating: '★★★★☆' },
        { title: '404: Love Not Found', sub: 'Romantic comedy', rating: '★★★☆☆' },
        { title: 'console.log("The Movie")', sub: 'Documentary', rating: '★★★★★' },
        { title: 'Legacy Code', sub: 'Horror. Viewer discretion advised', rating: '★★★★★' },
      ],
    },
    construction: {
      id: 'construction',
      title: 'Next Project',
      chip: 'UNDER CONSTRUCTION',
      color: '#e8a13a',
      tagline: 'This lot is reserved',
      html: `
        <p class="lead">A new building is going up here.</p>
        <p>It could be <b>your project</b> — I take products from idea or raw MVP to production:
        booking systems, subscription platforms, storefronts, real-time apps.</p>
        <div class="progress-wrap"><div class="progress-bar"></div></div>
        <p class="progress-label">Foundation poured · architecture drafted · crane on site</p>
        <a class="cta-btn" href="mailto:aseev.doonel@gmail.com">Start a project →</a>`,
    },
  },
};
