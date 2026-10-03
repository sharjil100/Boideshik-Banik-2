/* Catalogue data for the Boideshik Banik mockup. Prices are per piece in BDT. */
window.BB_DATA = {
  lot: [
    { id: 'aero', cat: 'Audio', name: 'Aero TWS earbuds', art: 'earbuds', price: 640, moq: 500,
      colors: [['White', '#f4f3ef'], ['Black', '#262626'], ['Sage', '#b7c4a3']] },
    { id: 'volt', cat: 'Power', name: 'Volt 20000mAh power bank', art: 'powerbank', price: 1150, was: 1310, moq: 200, badge: 'Save 12%',
      colors: [['Black', '#2a2a2a'], ['White', '#efeee9'], ['Navy', '#2f3b5c']] },
    { id: 'nano', cat: 'Charging', name: 'Nano 65W GaN charger', art: 'charger', price: 890, moq: 300,
      colors: [['White', '#f2f1ed'], ['Black', '#2a2a2a'], ['Beige', '#d8cbb8']] },
    { id: 'echo', cat: 'Audio', name: 'Echo mini speaker', art: 'speaker', price: 980, moq: 300,
      colors: [['Navy', '#2f3b5c'], ['Beige', '#d8cbb8'], ['Terracotta', '#c9825b']] },
    { id: 'pulse', cat: 'Wearables', name: 'Pulse fit smartwatch', art: 'smartwatch', price: 1480, was: 1580, moq: 200, badge: 'Save 6%',
      colors: [['Black', '#2a2a2a'], ['Terracotta', '#c9825b'], ['Sage', '#b7c4a3']] },
    { id: 'braid', cat: 'Cables', name: 'Braid USB-C cable', art: 'cable', price: 95, moq: 1000,
      sizes: [['1 m', 95], ['2 m', 135]], colors: [['Grey', '#9a9894']] }
  ],

  arrivals: [
    { cat: 'Content creation', name: 'Halo 12" ring light', art: 'ringlight', color: '#2a2a2a', from: 1240, to: 1390, moq: 100 },
    { cat: 'Smart home', name: 'Watchman WiFi camera', art: 'cctv', color: '#f3f2ee', from: 1590, to: 1750, moq: 100, badge: 'Save 9%' },
    { cat: 'Grooming', name: 'Edge pro beard trimmer', art: 'trimmer', color: '#2f3b5c', from: 720, to: 810, moq: 200 },
    { cat: 'Cooling', name: 'Breeze handheld fan', art: 'minifan', color: '#b7c4a3', from: 330, to: 380, moq: 500 },
    { cat: 'Computer', name: 'Glide silent mouse', art: 'mouse', color: '#efeee9', from: 410, to: 460, moq: 300 },
    { cat: 'Computer', name: 'Keys 68 mechanical keyboard', art: 'keyboard', color: '#d8cbb8', from: 2650, to: 2900, moq: 100 },
    { cat: 'Smart home', name: 'Lumi smart LED bulb', art: 'bulb', color: '#f4f3ef', from: 260, to: 295, moq: 1000, badge: 'Save 10%' },
    { cat: 'Gaming', name: 'Rally wireless gamepad', art: 'controller', color: '#2a2a2a', from: 1150, to: 1290, moq: 200 },
    { cat: 'Accessories', name: 'Fold aluminium phone stand', art: 'phonestand', color: '#c9c7c2', from: 240, to: 275, moq: 500 }
  ],

  feed: [
    { bg: 'linear-gradient(160deg,#cdb8a2,#8f6f5a)', items: [['earbuds', '#f4f3ef', 'front'], ['powerbank', '#2a2a2a', 'angle']] },
    { bg: 'linear-gradient(160deg,#3a4566,#1c2236)', items: [['speaker', '#2f3b5c', 'front']] },
    { bg: 'linear-gradient(160deg,#e8e1d6,#c8bba8)', items: [['ringlight', '#2a2a2a', 'front'], ['phonestand', '#c9c7c2', 'front']] },
    { bg: 'linear-gradient(160deg,#c8d3c3,#94a68d)', items: [['smartwatch', '#2a2a2a', 'angle']] },
    { bg: 'linear-gradient(160deg,#d99a73,#a35f3f)', items: [['controller', '#2a2a2a', 'front'], ['mouse', '#efeee9', 'angle']] }
  ],

  voices: [
    { name: 'Rafiq Hasan', org: 'Hasan Mobile Corner, Dhaka', hue: '#a86b56',
      quote: 'We moved our earbud and charger imports to Boideshik Banik. Prices are fair and every carton arrives exactly as promised.' },
    { name: 'Nusrat Jahan', org: 'Gadget Haat, Chattogram', hue: '#6f7f6a',
      quote: 'The mixed-lot option lets us test new products without locking up all our capital in one item.' },
    { name: 'Tanvir Ahmed', org: 'TechPoint BD, Sylhet', hue: '#5c6680',
      quote: 'Samples came in a week and bulk stock in three. The quality matched the samples perfectly.' },
    { name: 'Sharmin Akter', org: 'Online seller, Rajshahi', hue: '#9b7b5b',
      quote: 'Clear price tiers and no hidden customs charges. Finally an importer who picks up the phone.' },
    { name: 'Mahmud Karim', org: 'Karim Electronics, Khulna', hue: '#755354',
      quote: 'Our smartwatch order sold out in two weeks. We have already placed the next one.' },
    { name: 'Farzana Rahman', org: 'Smart Bazar, Cumilla', hue: '#7c8b8f',
      quote: 'Their team checks every batch before it ships. Our return rate has never been lower.' }
  ],

  hubs: [
    { name: 'Shenzhen', note: 'Audio, wearables & smart devices', img: 'assets/img/photos/hub-shenzhen.jpg' },
    { name: 'Guangzhou', note: 'Chargers, cables & accessories', img: 'assets/img/photos/hub-guangzhou.jpg' },
    { name: 'Yiwu', note: 'Small gadgets & packaging', img: 'assets/img/photos/hub-yiwu.jpg' },
    { name: 'Ningbo', note: 'Sea freight consolidation', img: 'assets/img/photos/hub-ningbo.jpg' },
    { name: 'Dhaka', note: 'Distribution & after-sales', img: 'assets/img/photos/hub-dhaka.jpg' }
  ]
};
