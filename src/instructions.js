// Beginner-friendly instructions in English and Bangla (data only).
// Inline markup: **bold**, `code`. Block types: p, ul, ol, table, patterns, tip, formula, faq, steps.

const en = {
  lang: 'en',
  pageTitle: 'How to play — Source & Sink Hunter',
  title: 'How to play',
  subtitle: 'A complete beginner’s guide. No maths background needed — if you can read a weather map, you can play this game.',
  langLabel: 'Language',
  play: 'Play now',
  leaderboard: 'Leaderboard',
  toc: 'On this page',
  readTime: 'About 5 minutes to read',
  sections: [
    {
      id: 'idea',
      title: '1. The game in one sentence',
      blocks: [
        { p: 'You look at a picture full of little arrows and find the hidden spots where the “flow” **comes out** (a **source**) or **goes in** (a **sink**). Click on them with the right tool to score points.' },
        { tip: 'Think of the arrows as water moving on a floor. A source is a tap pouring water out. A sink is a drain swallowing water.' },
      ],
    },
    {
      id: 'arrows',
      title: '2. What do the arrows mean?',
      blocks: [
        { p: 'The picture is called a **vector field**. At every point there is an arrow that shows which way something (water, air, heat…) is moving at that spot.' },
        {
          ul: [
            'The **direction** of an arrow = the direction of the flow.',
            'The **colour** of an arrow = how strong the flow is: **light blue = weak**, **dark blue = strong**.',
            'All arrows have the same length, so you can always see the direction clearly.',
            'The grid goes from −5 to 5 left–right (x) and from −5 to 5 bottom–top (y).',
          ],
        },
      ],
    },
    {
      id: 'divergence',
      title: '3. What is divergence?',
      blocks: [
        { p: '**Divergence** tells you whether flow is spreading out or squeezing in at a point. Imagine drawing a tiny circle around the point and counting the water:' },
        {
          ul: [
            'More water **leaves** the circle than enters → divergence is **positive** (div F > 0) → **source**.',
            'More water **enters** than leaves → divergence is **negative** (div F < 0) → **sink**.',
            'The same amount enters and leaves → divergence is **zero** (div F = 0) → nothing special there.',
          ],
        },
        { formula: 'div F = ∂P/∂x + ∂Q/∂y' },
        { p: 'Here F = (P, Q): P is the left–right part of the arrow and Q is the up–down part. You do **not** have to calculate anything — the game shows you the number every time you click.' },
      ],
    },
    {
      id: 'patterns',
      title: '4. Learn to spot the four patterns',
      blocks: [
        {
          patterns: [
            { key: 'source', title: 'Source (+)', text: 'Arrows point **away** from one spot, like a tap. div F > 0. Use the Source tool.' },
            { key: 'sink', title: 'Sink (−)', text: 'Arrows point **into** one spot, like a drain. div F < 0. Use the Sink tool.' },
            { key: 'swirl', title: 'Swirl — a trap!', text: 'Arrows go **round and round**. It looks exciting, but nothing comes out or goes in: div F = 0. Do not click it.' },
            { key: 'wind', title: 'Wind — a distraction', text: 'All arrows lean the **same way**. A steady wind just passes through: div F = 0.' },
          ],
        },
        { tip: 'Rotation is called **curl**, not divergence. A whirlpool has curl but zero divergence — that is the lesson of Level 5.' },
      ],
    },
    {
      id: 'steps',
      title: '5. How to play, step by step',
      blocks: [
        {
          steps: [
            '**Enter your name and a username** in the popup the first time you open the game. Your username is unique — it is your “key” to your saved scores.',
            'Press **Start** (or pick any level from **Choose a level**).',
            'Look at the arrows. Find a spot where they **spread out** (source) or **point in** (sink).',
            'Choose the right tool on the right: **Source (+)** or **Sink (−)**. Keyboard: press **S** for source, **K** for sink.',
            'Click on the spot. You must be close — within about one grid square (0.6 units).',
            'Read the **Last click** box: it shows the exact divergence at your click and tells you if you were right.',
            'When you have found every source and sink, the level is complete and the hidden formula is revealed.',
            'Press **Next level**, or jump to any level with the numbered buttons **1–6** above the field.',
          ],
        },
      ],
    },
    {
      id: 'feedback',
      title: '6. Understanding the feedback',
      blocks: [
        {
          table: {
            head: ['You see…', 'It means…'],
            rows: [
              ['A green circle with **+**', 'You found a source. +100 points.'],
              ['A red circle with **−**', 'You found a sink. +100 points.'],
              ['A dark **×** with a number', 'A miss. The number is div F at that point. −25 points.'],
              ['“switch tool?”', 'You are right next to a target, but holding the wrong tool.'],
              ['“div F ≈ 0 — just passing through”', 'Nothing here. Look for a place where arrows start or end.'],
            ],
          },
        },
      ],
    },
    {
      id: 'scoring',
      title: '7. Scoring',
      blocks: [
        {
          table: {
            head: ['Action', 'Points'],
            rows: [
              ['Correct click (hit)', '+100'],
              ['Wrong click (miss)', '−25 (your score never goes below 0)'],
              ['Hint: show divergence heatmap', '−50, only once per level'],
              ['Time bonus when you finish', '200 − 2 × seconds (never below 0)'],
            ],
          },
        },
        { p: 'The **heatmap hint** colours the field: **red = positive divergence (sources)**, **blue = negative (sinks)**. While it is on, the cursor also shows the live div F value.' },
      ],
    },
    {
      id: 'controls',
      title: '8. Controls',
      blocks: [
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['Mouse click / tap on the field', 'Place your tool (probe the divergence)'],
              ['**S** key or **Source (+)** button', 'Select the source tool'],
              ['**K** key or **Sink (−)** button', 'Select the sink tool'],
              ['‹ 1 2 3 4 5 6 › above the field', 'Go to the previous / next / any level'],
              ['Restart level', 'Start the current level again'],
              ['Your name (top-right corner)', 'Switch player or “Start from new”'],
            ],
          },
        },
      ],
    },
    {
      id: 'saving',
      title: '9. Players, saved scores and the leaderboard',
      blocks: [
        {
          ul: [
            'Your **best score for every level** is saved automatically in this browser (localStorage + a cookie). Refresh the page — your scores are still there.',
            'Your name and username are shown in the **top-right corner**.',
            'Come back later and enter the **same username** → the game recognises you and loads your history.',
            'Usernames are **unique**: two players cannot share one username (“Sejuti” and “sejuti” count as the same).',
            '**Start from new** (top-right menu, or on the start screen) deletes only *your* scores so you can begin again.',
            'The **Leaderboard** page ranks all players on this computer by total score. Its **Clear history** button deletes every player and score.',
          ],
        },
        { tip: 'Scores are stored only on this computer and this browser. Nothing is sent to the internet.' },
      ],
    },
    {
      id: 'tips',
      title: '10. Tips for beginners',
      blocks: [
        {
          ul: [
            'Start with Level 1 and 2 — there is only one target, so you can see the pattern clearly.',
            'Look for the place where arrows **change direction suddenly**: that is usually the centre of a source or sink.',
            'Dark (strong) arrows are often near a target.',
            'Missed? Read the number. A big positive number means you are close to a source; a big negative one means a sink is near.',
            'Use the heatmap hint when you are stuck — 50 points is cheaper than many wrong clicks.',
            'In the last level some targets are **weak**. Look closely for small groups of arrows that spread out or come together.',
          ],
        },
      ],
    },
    {
      id: 'faq',
      title: '11. Questions',
      blocks: [
        {
          faq: [
            { q: 'Do I need to know calculus?', a: 'No. The game calculates div F for you. Just watch whether arrows spread out or come together.' },
            { q: 'Why is the swirl not a source or sink?', a: 'In a swirl, every bit of water that flows into a small circle also flows out of it. Nothing is created or destroyed, so div F = 0.' },
            { q: 'I refreshed the page. Is my progress lost?', a: 'No. Finished levels and your best scores are saved. The level you were playing restarts from the beginning.' },
            { q: 'I played on another computer and my scores are missing.', a: 'Scores are saved in each browser separately. Use the same browser on the same computer.' },
            { q: 'Someone else wants to play on my computer.', a: 'Click your name in the top-right corner → Switch player. They enter their own name and a different username.' },
          ],
        },
      ],
    },
  ],
};

const bn = {
  lang: 'bn',
  pageTitle: 'কীভাবে খেলবেন — Source & Sink Hunter',
  title: 'কীভাবে খেলবেন',
  subtitle: 'একদম নতুনদের জন্য সম্পূর্ণ গাইড। গণিতের আগের জ্ঞান লাগবে না — আবহাওয়ার মানচিত্র পড়তে পারলেই এই গেম খেলতে পারবেন।',
  langLabel: 'ভাষা',
  play: 'এখনই খেলুন',
  leaderboard: 'লিডারবোর্ড',
  toc: 'এই পাতায় যা আছে',
  readTime: 'পড়তে প্রায় ৫ মিনিট লাগবে',
  sections: [
    {
      id: 'idea',
      title: '১. এক বাক্যে গেমটি',
      blocks: [
        { p: 'আপনি অনেকগুলো ছোট তীরচিহ্নের একটি ছবি দেখবেন, আর খুঁজে বের করবেন সেই লুকানো জায়গাগুলো যেখান থেকে “প্রবাহ” **বের হয়** (**সোর্স / Source**) অথবা যেখানে প্রবাহ **ঢুকে যায়** (**সিঙ্ক / Sink**)। সঠিক টুল দিয়ে সেখানে ক্লিক করলেই পয়েন্ট পাবেন।' },
        { tip: 'তীরগুলোকে মেঝের উপর দিয়ে বয়ে যাওয়া পানি ভাবুন। সোর্স হলো একটি কল, যেখান থেকে পানি বের হচ্ছে। সিঙ্ক হলো একটি ড্রেন, যেখানে পানি ঢুকে যাচ্ছে।' },
      ],
    },
    {
      id: 'arrows',
      title: '২. তীরচিহ্নগুলোর মানে কী?',
      blocks: [
        { p: 'এই ছবিটিকে বলা হয় **ভেক্টর ফিল্ড (vector field)**। প্রতিটি বিন্দুতে একটি তীর দেখায় যে সেখানে কোনো কিছু (পানি, বাতাস, তাপ…) কোন দিকে যাচ্ছে।' },
        {
          ul: [
            'তীরের **দিক** = প্রবাহের দিক।',
            'তীরের **রং** = প্রবাহ কতটা শক্তিশালী: **হালকা নীল = দুর্বল**, **গাঢ় নীল = শক্তিশালী**।',
            'সব তীরের দৈর্ঘ্য সমান, যাতে দিকটা সবসময় পরিষ্কার বোঝা যায়।',
            'গ্রিডটি বাম–ডানে (x) −5 থেকে 5 এবং নিচ–উপরে (y) −5 থেকে 5 পর্যন্ত।',
          ],
        },
      ],
    },
    {
      id: 'divergence',
      title: '৩. ডাইভারজেন্স (Divergence) কী?',
      blocks: [
        { p: '**ডাইভারজেন্স** বলে দেয় কোনো বিন্দুতে প্রবাহ ছড়িয়ে পড়ছে নাকি ভেতরে জমা হচ্ছে। বিন্দুটির চারপাশে একটি খুব ছোট বৃত্ত কল্পনা করুন, তারপর পানির হিসাব করুন:' },
        {
          ul: [
            'বৃত্ত থেকে যত পানি **বের হয়**, ঢোকে তার চেয়ে কম → ডাইভারজেন্স **ধনাত্মক** (div F > 0) → **সোর্স**।',
            'বৃত্তে যত পানি **ঢোকে**, বের হয় তার চেয়ে কম → ডাইভারজেন্স **ঋণাত্মক** (div F < 0) → **সিঙ্ক**।',
            'যতটুকু ঢোকে ঠিক ততটুকুই বের হয় → ডাইভারজেন্স **শূন্য** (div F = 0) → সেখানে বিশেষ কিছু নেই।',
          ],
        },
        { formula: 'div F = ∂P/∂x + ∂Q/∂y' },
        { p: 'এখানে F = (P, Q): P হলো তীরের বাম–ডান অংশ আর Q হলো উপর–নিচ অংশ। আপনাকে কিছুই হিসাব করতে **হবে না** — প্রতিবার ক্লিক করলে গেম নিজেই সংখ্যাটি দেখিয়ে দেয়।' },
      ],
    },
    {
      id: 'patterns',
      title: '৪. চারটি প্যাটার্ন চিনতে শিখুন',
      blocks: [
        {
          patterns: [
            { key: 'source', title: 'সোর্স (+)', text: 'তীরগুলো একটি জায়গা থেকে **দূরে** যায়, ঠিক কলের মতো। div F > 0। Source টুল ব্যবহার করুন।' },
            { key: 'sink', title: 'সিঙ্ক (−)', text: 'তীরগুলো একটি জায়গার **ভেতরের দিকে** আসে, ঠিক ড্রেনের মতো। div F < 0। Sink টুল ব্যবহার করুন।' },
            { key: 'swirl', title: 'ঘূর্ণি — একটি ফাঁদ!', text: 'তীরগুলো **গোল গোল ঘোরে**। দেখতে আকর্ষণীয়, কিন্তু কিছুই বের হয় না বা ঢোকে না: div F = 0। এখানে ক্লিক করবেন না।' },
            { key: 'wind', title: 'বাতাস — মনোযোগ নষ্টকারী', text: 'সব তীর **একই দিকে** হেলে থাকে। স্থির বাতাস শুধু পার হয়ে যায়: div F = 0।' },
          ],
        },
        { tip: 'ঘূর্ণনকে বলা হয় **কার্ল (curl)**, ডাইভারজেন্স নয়। ঘূর্ণিতে কার্ল আছে কিন্তু ডাইভারজেন্স শূন্য — লেভেল ৫-এর শিক্ষা এটাই।' },
      ],
    },
    {
      id: 'steps',
      title: '৫. ধাপে ধাপে কীভাবে খেলবেন',
      blocks: [
        {
          steps: [
            'প্রথমবার গেম খুললে পপআপে **আপনার নাম এবং একটি ইউজারনেম** লিখুন। ইউজারনেমটি অনন্য (unique) — এটিই আপনার সংরক্ষিত স্কোরের “চাবি”।',
            '**Start** চাপুন (অথবা **Choose a level** থেকে যেকোনো লেভেল বেছে নিন)।',
            'তীরগুলো দেখুন। এমন জায়গা খুঁজুন যেখানে তীরগুলো **ছড়িয়ে পড়ে** (সোর্স) বা **ভেতরের দিকে আসে** (সিঙ্ক)।',
            'ডান পাশ থেকে সঠিক টুল বেছে নিন: **Source (+)** বা **Sink (−)**। কিবোর্ডে: সোর্সের জন্য **S**, সিঙ্কের জন্য **K** চাপুন।',
            'জায়গাটিতে ক্লিক করুন। আপনাকে কাছাকাছি ক্লিক করতে হবে — প্রায় এক ঘরের মধ্যে (0.6 একক)।',
            '**Last click** বক্সটি পড়ুন: সেখানে আপনার ক্লিকের জায়গার সঠিক ডাইভারজেন্স দেখায় এবং বলে দেয় আপনি ঠিক ছিলেন কি না।',
            'সব সোর্স ও সিঙ্ক খুঁজে পেলে লেভেল শেষ হয় এবং লুকানো সূত্রটি দেখানো হয়।',
            '**Next level** চাপুন, অথবা ফিল্ডের উপরের **1–6** নম্বর বোতাম দিয়ে যেকোনো লেভেলে চলে যান।',
          ],
        },
      ],
    },
    {
      id: 'feedback',
      title: '৬. ফলাফল বোঝা',
      blocks: [
        {
          table: {
            head: ['আপনি যা দেখবেন…', 'এর মানে…'],
            rows: [
              ['**+** চিহ্নসহ সবুজ বৃত্ত', 'আপনি একটি সোর্স খুঁজে পেয়েছেন। +100 পয়েন্ট।'],
              ['**−** চিহ্নসহ লাল বৃত্ত', 'আপনি একটি সিঙ্ক খুঁজে পেয়েছেন। +100 পয়েন্ট।'],
              ['সংখ্যাসহ গাঢ় **×** চিহ্ন', 'ভুল ক্লিক। সংখ্যাটি হলো ওই বিন্দুর div F। −25 পয়েন্ট।'],
              ['“switch tool?”', 'আপনি একটি লক্ষ্যের একদম পাশে আছেন, কিন্তু ভুল টুল হাতে।'],
              ['“div F ≈ 0 — just passing through”', 'এখানে কিছু নেই। এমন জায়গা খুঁজুন যেখানে তীর শুরু বা শেষ হয়।'],
            ],
          },
        },
      ],
    },
    {
      id: 'scoring',
      title: '৭. স্কোরিং',
      blocks: [
        {
          table: {
            head: ['কাজ', 'পয়েন্ট'],
            rows: [
              ['সঠিক ক্লিক (hit)', '+100'],
              ['ভুল ক্লিক (miss)', '−25 (স্কোর কখনো 0-এর নিচে যাবে না)'],
              ['হিন্ট: ডাইভারজেন্স হিটম্যাপ দেখান', '−50, প্রতি লেভেলে মাত্র একবার'],
              ['লেভেল শেষ করলে সময় বোনাস', '200 − 2 × সেকেন্ড (কখনো 0-এর নিচে নয়)'],
            ],
          },
        },
        { p: '**হিটম্যাপ হিন্ট** ফিল্ডটিকে রং করে দেয়: **লাল = ধনাত্মক ডাইভারজেন্স (সোর্স)**, **নীল = ঋণাত্মক (সিঙ্ক)**। হিন্ট চালু থাকলে কার্সরের পাশে সরাসরি div F-এর মানও দেখা যায়।' },
      ],
    },
    {
      id: 'controls',
      title: '৮. নিয়ন্ত্রণ',
      blocks: [
        {
          table: {
            head: ['নিয়ন্ত্রণ', 'কাজ'],
            rows: [
              ['ফিল্ডে মাউস ক্লিক / ট্যাপ', 'টুল বসানো (ডাইভারজেন্স পরীক্ষা)'],
              ['**S** কী অথবা **Source (+)** বোতাম', 'সোর্স টুল বেছে নেওয়া'],
              ['**K** কী অথবা **Sink (−)** বোতাম', 'সিঙ্ক টুল বেছে নেওয়া'],
              ['ফিল্ডের উপরে ‹ 1 2 3 4 5 6 ›', 'আগের / পরের / যেকোনো লেভেলে যাওয়া'],
              ['Restart level', 'বর্তমান লেভেল আবার শুরু করা'],
              ['আপনার নাম (উপরে ডান কোণে)', 'প্লেয়ার বদলানো বা “Start from new”'],
            ],
          },
        },
      ],
    },
    {
      id: 'saving',
      title: '৯. প্লেয়ার, সংরক্ষিত স্কোর এবং লিডারবোর্ড',
      blocks: [
        {
          ul: [
            'প্রতিটি লেভেলে আপনার **সেরা স্কোর** এই ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত হয় (localStorage + একটি কুকি)। পেজ রিফ্রেশ করলেও স্কোর থেকে যাবে।',
            'আপনার নাম ও ইউজারনেম **উপরে ডান কোণে** দেখা যায়।',
            'পরে ফিরে এসে **একই ইউজারনেম** দিলে গেম আপনাকে চিনে নেবে এবং আপনার আগের ইতিহাস লোড করবে।',
            'ইউজারনেম **অনন্য**: দুইজন প্লেয়ার একই ইউজারনেম ব্যবহার করতে পারবে না (“Sejuti” আর “sejuti” একই ধরা হয়)।',
            '**Start from new** (উপরে ডান কোণের মেনু বা শুরুর পাতা থেকে) শুধু *আপনার* স্কোর মুছে দেয়, যাতে নতুন করে শুরু করতে পারেন।',
            '**লিডারবোর্ড** পাতায় এই কম্পিউটারের সব প্লেয়ারকে মোট স্কোর অনুযায়ী সাজানো থাকে। সেখানের **Clear history** বোতাম সব প্লেয়ার ও স্কোর মুছে দেয়।',
          ],
        },
        { tip: 'স্কোর শুধু এই কম্পিউটার ও এই ব্রাউজারেই থাকে। ইন্টারনেটে কিছুই পাঠানো হয় না।' },
      ],
    },
    {
      id: 'tips',
      title: '১০. নতুনদের জন্য টিপস',
      blocks: [
        {
          ul: [
            'লেভেল ১ ও ২ দিয়ে শুরু করুন — সেখানে মাত্র একটি লক্ষ্য, তাই প্যাটার্নটি পরিষ্কার দেখা যায়।',
            'যেখানে তীরগুলো **হঠাৎ দিক বদলায়** সেই জায়গা খুঁজুন: সাধারণত সেটিই সোর্স বা সিঙ্কের কেন্দ্র।',
            'গাঢ় (শক্তিশালী) তীরগুলো প্রায়ই লক্ষ্যের কাছে থাকে।',
            'ভুল হলে সংখ্যাটি পড়ুন। বড় ধনাত্মক সংখ্যা মানে কাছেই সোর্স; বড় ঋণাত্মক সংখ্যা মানে কাছেই সিঙ্ক।',
            'আটকে গেলে হিটম্যাপ হিন্ট ব্যবহার করুন — অনেকগুলো ভুল ক্লিকের চেয়ে 50 পয়েন্ট কম খরচ।',
            'শেষ লেভেলে কিছু লক্ষ্য **দুর্বল**। তীরগুলো কোথায় অল্প অল্প ছড়িয়ে পড়ছে বা একত্র হচ্ছে, মনোযোগ দিয়ে দেখুন।',
          ],
        },
      ],
    },
    {
      id: 'faq',
      title: '১১. প্রশ্নোত্তর',
      blocks: [
        {
          faq: [
            { q: 'ক্যালকুলাস জানা কি জরুরি?', a: 'না। গেম নিজেই div F হিসাব করে দেয়। শুধু দেখুন তীরগুলো ছড়িয়ে পড়ছে নাকি একত্র হচ্ছে।' },
            { q: 'ঘূর্ণি কেন সোর্স বা সিঙ্ক নয়?', a: 'ঘূর্ণিতে একটি ছোট বৃত্তে যতটুকু পানি ঢোকে, ঠিক ততটুকুই বের হয়ে যায়। কিছু তৈরি বা ধ্বংস হয় না, তাই div F = 0।' },
            { q: 'পেজ রিফ্রেশ করেছি। আমার অগ্রগতি কি হারিয়ে গেছে?', a: 'না। শেষ করা লেভেল ও আপনার সেরা স্কোর সংরক্ষিত থাকে। যে লেভেলটি খেলছিলেন সেটি শুধু শুরু থেকে আবার চালু হয়।' },
            { q: 'অন্য কম্পিউটারে খেলেছিলাম, সেখানে স্কোর নেই।', a: 'প্রতিটি ব্রাউজারে স্কোর আলাদাভাবে সংরক্ষিত হয়। একই কম্পিউটারে একই ব্রাউজার ব্যবহার করুন।' },
            { q: 'আমার কম্পিউটারে অন্য কেউ খেলতে চায়।', a: 'উপরে ডান কোণে আপনার নামে ক্লিক করুন → Switch player। তারা নিজের নাম আর ভিন্ন একটি ইউজারনেম দেবে।' },
          ],
        },
      ],
    },
  ],
};

export const INSTRUCTIONS = { en, bn };
export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
];
