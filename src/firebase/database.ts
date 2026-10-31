import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import {
  Product,
  Article,
  Category,
  SavedItem,
  InvestmentWatchlistItem,
  ReportItem,
  AdminAuditLog,
  SectionId,
} from '../types';

// Initial seed catalog covering all 9 sections thoroughly
export const INITIAL_PRODUCTS: Product[] = [
  // SECTION 1: TESLA CARS AND CLEAN ENERGY
  {
    id: 'tesla-cybertruck-cyberbeast',
    title: 'Tesla Cybertruck — Cyberbeast',
    subtitle: 'Tri-Motor All-Wheel Drive, Ultra-Hard 30X Cold-Rolled Stainless Steel',
    sectionId: 'tesla',
    category: 'Cybertruck',
    price: 99990,
    specs: {
      '0-60 mph': '2.6 seconds',
      'Range (est.)': '320 miles',
      'Towing Capacity': '11,000 lbs',
      'Drivetrain': 'Tri-Motor AWD',
      'Armor Glass': 'Class 4 Impact Resistant',
      'Steer-by-Wire': 'Variable Ratio Electronic',
    },
    images: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600'],
    description: 'Built for any planet. Powered by three motors producing 845 horsepower with torque vectoring, steer-by-wire, and shatter-resistant armor glass.',
    isFeatured: true,
    inStock: true,
    inventoryCount: 14,
    deliveryEstimate: '2–4 weeks',
    badge: 'Flagship EV',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tesla-model-s-plaid',
    title: 'Tesla Model S Plaid',
    subtitle: '1,020 Horsepower, Carbon-Sleeved Rotors, 396 Mile Range',
    sectionId: 'tesla',
    category: 'Model S',
    price: 89990,
    specs: {
      '0-60 mph': '1.99 seconds',
      'Top Speed': '200 mph',
      'Range': '359 miles',
      'Peak Power': '1,020 hp',
      'Aerodynamics': '0.208 Cd lowest on Earth',
    },
    images: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600'],
    description: 'The quickest accelerating production sedan on the planet. Tri-motor powertrain with torque vectoring and carbon-sleeved rotors.',
    isFeatured: true,
    inStock: true,
    inventoryCount: 8,
    deliveryEstimate: '1–3 weeks',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tesla-powerwall-3',
    title: 'Tesla Powerwall 3',
    subtitle: 'Next-Gen Whole-Home Solar Backup with Integrated Inverter',
    sectionId: 'tesla',
    category: 'Powerwall',
    price: 11500,
    specs: {
      'Energy Capacity': '13.5 kWh',
      'Continuous Power': '11.5 kW on-grid & backup',
      'Solar Inverter': '6 Solar MPPTs built-in',
      'Warranty': '10 Years 100% capacity',
    },
    images: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600'],
    description: 'Fully integrated solar and storage system. Powers all standard appliances seamlessly during grid failures with uninterrupted automated switchover.',
    isFeatured: false,
    inStock: true,
    inventoryCount: 45,
    deliveryEstimate: 'Ready to install',
    createdAt: new Date().toISOString(),
  },

  // SECTION 2: ROBOTS AND ROBOTICS
  {
    id: 'tesla-optimus-gen2',
    title: 'Tesla Optimus — Gen 2 Humanoid Robot',
    subtitle: 'Autonomous General-Purpose Bipedal Worker & Assistant',
    sectionId: 'robotics',
    category: 'Optimus',
    price: 24500,
    specs: {
      'Height': '5 ft 8 in (173 cm)',
      'Weight': '125 lbs (57 kg)',
      'Degrees of Freedom': '28 structural + 22 hand DoF',
      'Actuators': 'Tesla-designed integrated torque sensors',
      'Tactile Sensing': '10-finger tactile pressure arrays',
      'Compute': 'Dual Tesla FSD Computer modules',
    },
    images: ['https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600'],
    description: 'Designed to eliminate unsafe, repetitive, or tedious physical labor. Optimus Gen 2 features custom Tesla actuators, tactile finger pads capable of manipulating eggs, and end-to-end neural network perception.',
    isFeatured: true,
    inStock: true,
    inventoryCount: 12,
    deliveryEstimate: 'Commercial reservation tier',
    badge: 'Breakthrough Robotics',
    createdAt: new Date().toISOString(),
  },

  // SECTION 3: SPACE AND ROCKETS
  {
    id: 'spacex-starship-payload-slot',
    title: 'SpaceX Starship Commercial Payload Slot',
    subtitle: 'Fully Reusable Orbital Super Heavy Launch Architecture',
    sectionId: 'spacex',
    category: 'Starship',
    price: 1250000,
    specs: {
      'Payload to LEO': '150+ metric tons',
      'Diameter': '9 meters',
      'Height': '121 meters combined stack',
      'Raptor 3 Engines': '33 Booster + 6 Ship engines',
      'Propellant': 'Liquid Methane (CH4) & Liquid Oxygen (LOX)',
    },
    images: ['https://images.unsplash.com/photo-1517976487492-5750f3195933?w=600'],
    description: 'The most powerful rocket system ever flown in human history. Fully reusable two-stage rocket capable of transporting unprecedented cargo mass and human explorers to orbit, the Moon, and Mars.',
    isFeatured: true,
    inStock: true,
    inventoryCount: 3,
    deliveryEstimate: 'Manifest window 2026/2027',
    badge: 'Deep Space',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'spacex-dragon-rideshare',
    title: 'Dragon 2 Microgravity Research Rack',
    subtitle: 'Commercial pressurized pressurized laboratory slot on ISS mission',
    sectionId: 'spacex',
    category: 'Dragon',
    price: 380000,
    specs: {
      'Capacity': 'Up to 7 crew or 3,000 kg cargo',
      'Habitable Volume': '9.3 m³',
      'Power to Payload': 'Up to 2.0 kW continuous',
      'Re-entry': 'PICA-X thermal heatshield with ocean recovery',
    },
    images: ['https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=600'],
    description: 'Standardized research locker onboard autonomous Dragon 2 spacecraft. Includes active cooling, data links, and precision atmospheric return to Earth.',
    isFeatured: false,
    inStock: true,
    inventoryCount: 5,
    createdAt: new Date().toISOString(),
  },

  // SECTION 4: STARLINK
  {
    id: 'starlink-standard-gen4-kit',
    title: 'Starlink Gen 4 High-Performance Terminal',
    subtitle: 'Next-Gen Low-Earth Orbit Phased Array with Wi-Fi 6 Router',
    sectionId: 'starlink',
    category: 'Equipment',
    price: 499,
    specs: {
      'Latency': '18–25 ms',
      'Download Speeds': 'Up to 300+ Mbps',
      'Field of View': '110° Phased Array Scan',
      'Weather Resistance': 'IP67 waterproof with snow melt',
      'Power Consumption': '50–75 W typical',
    },
    images: ['https://images.unsplash.com/photo-1495578942200-c5f5d7af99d3?w=600'],
    description: 'Engineered by SpaceX to deliver high-speed, low-latency broadband internet across the most remote oceans, mountain peaks, and rural communities on Earth.',
    isFeatured: true,
    inStock: true,
    inventoryCount: 150,
    deliveryEstimate: '3–5 business days',
    badge: 'Global Connectivity',
    createdAt: new Date().toISOString(),
  },

  // SECTION 5: ARTIFICIAL INTELLIGENCE
  {
    id: 'xai-grok-enterprise-node',
    title: 'xAI Grok Enterprise Inference Cluster',
    subtitle: 'Colossus Supercomputer Enterprise API Access & Dedicated Weights',
    sectionId: 'xai',
    category: 'Grok',
    price: 15000,
    specs: {
      'Architecture': 'Frontier Multimodal Reasoning Model',
      'Context Window': '1,000,000 Tokens native',
      'Training Infrastructure': 'Memphis Colossus 100k H100 Cluster',
      'Real-time Access': 'Live uncensored X ecosystem knowledge grounding',
    },
    images: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'],
    description: 'Enterprise API integration into the frontier intelligence developed by xAI. Built with a profound pursuit of cosmic understanding and truth-seeking reasoning.',
    isFeatured: true,
    inStock: true,
    inventoryCount: 20,
    deliveryEstimate: 'Immediate digital key provisioning',
    createdAt: new Date().toISOString(),
  },

  // SECTION 6: NEURALINK
  {
    id: 'neuralink-telepathy-developer-suite',
    title: 'Neuralink Telepathy Research Simulator & SDK',
    subtitle: 'Brain-Computer Interface Developer Kit & High-Bandwidth Neural Emulators',
    sectionId: 'neuralink',
    category: 'Brain-computer interfaces',
    price: 4800,
    specs: {
      'Channels': '1,024 neural electrode emulations',
      'Threads': '64 ultra-fine biocompatible threads',
      'Sampling Rate': '20 kHz per channel neural spike decoder',
      'Wireless': 'Low-energy Bluetooth & custom inductive charger',
    },
    images: ['https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600'],
    description: 'Hardware simulator and developer suite modeled on the Neuralink N1 Telepathy implant. Enables biomedical engineers to build direct digital thought interfaces.',
    isFeatured: false,
    inStock: true,
    inventoryCount: 10,
    createdAt: new Date().toISOString(),
  },

  // SECTION 7: THE BORING COMPANY
  {
    id: 'boring-prufrock-tunnel-segment',
    title: 'The Boring Company — Prufrock Automated Tunnel Rig',
    subtitle: 'Zero-Emission Continuous Mining & Concrete Ring Setting Machine',
    sectionId: 'boring',
    category: 'Transportation technology',
    price: 2500000,
    specs: {
      'Mining Velocity': 'Up to 1 mile per week',
      'Tunnel Diameter': '12 ft (3.65 m)',
      'Drive Power': 'All-electric battery & umbilical system',
      'Surface Launch': 'Porpoising entry/exit without open excavation pits',
    },
    images: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600'],
    description: 'Transforms urban transit. Prufrock digs continuously while installing pre-cast concrete tunnel rings, eliminating traffic congestion through 3D subterranean loop transit networks.',
    isFeatured: false,
    inStock: true,
    inventoryCount: 2,
    createdAt: new Date().toISOString(),
  },

  // SECTION 8: X AND DIGITAL COMMUNICATION
  {
    id: 'x-premium-organization-verified',
    title: 'X Premium Organization & Gold Checkmark Suite',
    subtitle: 'Global Enterprise Broadcast Node, Dedicated Support & Grok Access',
    sectionId: 'x',
    category: 'X platform',
    price: 1000,
    specs: {
      'Verification': 'Gold Verification Checkmark + Custom Organization Affiliation Badges',
      'Algorithm': 'Maximum Organic Reach Multiplier',
      'Video Uploads': 'Up to 3 hours in 1080p/4K resolution',
      'Analytics': 'Real-time audience engagement telemetry and monetization',
    },
    images: ['https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600'],
    description: 'The global digital town square. Official organization verification on X unlocks premier broadcasting capability, community notes, and direct integration into Grok AI.',
    isFeatured: false,
    inStock: true,
    inventoryCount: 999,
    deliveryEstimate: 'Instant digital badge',
    createdAt: new Date().toISOString(),
  },

  // SECTION 9: INVESTMENT INFORMATION
  {
    id: 'tesla-q4-financial-intelligence-dossier',
    title: 'Tesla (NASDAQ: TSLA) Institutional Equity Dossier',
    subtitle: 'Audited Financial Breakdown, Robotaxi Valuations & Energy Storage Forecasts',
    sectionId: 'investment',
    category: 'Company financial reports',
    price: 250,
    specs: {
      'Market Cap Reference': 'NASDAQ: TSLA (~$850B+)',
      'Free Cash Flow': '$4.5B+ Trailing 12M',
      'Energy Storage Deployment': '15.3 GWh deployed quarterly',
      'Operating Margin': 'Industry-leading automotive gross margins',
    },
    images: ['https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600'],
    description: 'Exhaustive institutional report containing balance sheet models, automotive cost curves, and autonomous vehicle fleet monetization analyses. Public market educational document.',
    isFeatured: true,
    inStock: true,
    inventoryCount: 500,
    deliveryEstimate: 'Instant PDF & raw CSV financial model download',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-starship-orbital-refueling',
    title: 'The Physics of Starship Orbital Refueling and Mars Transit',
    subtitle: 'How cryogenic fluid transfer in zero-gravity unlocks interplanetary commerce',
    sectionId: 'spacex',
    category: 'Launch information',
    author: 'SpaceX Propulsion Engineering Team',
    readTime: '6 min read',
    coverImage: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=600',
    content: `Achieving full reusability is the holy grail of rocket engineering, but reusability alone does not get millions of tons of equipment to Mars. To escape Earth's deep gravity well with over 100 tons of useful cargo, a ship must be refueled in Low Earth Orbit.\n\nStarship uses an innovative ship-to-ship docking system where liquid methane and liquid oxygen are settled using slight ullage thruster burns and transferred via hermetically sealed quick-disconnect couplings. This architecture reduces the cost per kilogram to deep space by more than two orders of magnitude compared to legacy expendable rockets.`,
    tags: ['Starship', 'Cryogenics', 'Mars Architecture', 'Orbital Mechanics'],
    isFeatured: true,
    publishedAt: 'October 2026',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'art-optimus-actuator-breakthrough',
    title: 'Optimus Gen 2: Precision Actuator Design & Tactile Physics',
    subtitle: 'Integrating biological biomechanics with high-density brushless electric motors',
    sectionId: 'robotics',
    category: 'Robot technology updates',
    author: 'Tesla Robotics Systems Division',
    readTime: '5 min read',
    coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600',
    content: `Humanoid robotics requires an unprecedented torque-to-weight ratio. Traditional industrial robots rely on heavy hydraulic pumps or off-the-shelf planetary gearboxes that produce clumsy motions.\n\nFor Optimus Gen 2, Tesla custom-designed integrated rotary and linear actuators featuring strain-wave gearing and compact dual-encoder feedback. Every finger contains custom tactile sensors capable of registering sub-gram forces, allowing delicate objects like raw eggs and semiconductor wafers to be manipulated with effortless biological fluidity.`,
    tags: ['Optimus', 'Actuators', 'Neural Networks', 'Automation'],
    isFeatured: true,
    publishedAt: 'October 2026',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'art-starlink-direct-to-cell',
    title: 'Starlink Direct-to-Cell: Eliminating Global Cellular Dead Zones',
    subtitle: 'Space-based eNodeB phased array antennas communicating directly with unmodified 4G LTE phones',
    sectionId: 'starlink',
    category: 'Satellite internet',
    author: 'Starlink Constellation Architecture',
    readTime: '4 min read',
    coverImage: 'https://images.unsplash.com/photo-1495578942200-c5f5d7af99d3?w=600',
    content: `For decades, satellite phones required giant specialized antennas and exorbitant subscription rates. With Starlink Direct-to-Cell, SpaceX has placed active cellular towers into space orbit.\n\nEquipped with enormous 25-square-meter phased array antennas, v2 mini satellites operate Doppler-corrected LTE protocol stacks that connect directly to ordinary, unmodified consumer smartphones anywhere on Earth where the sky is visible.`,
    tags: ['Starlink', 'Cellular', 'Phased Array', 'Global Telecom'],
    isFeatured: true,
    publishedAt: 'September 2026',
    createdAt: new Date().toISOString(),
  },
];

// Initialize and seed products and articles in Firestore if missing
export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      console.log('Seeding initial marketplace catalog to Firestore...');
      for (const prod of INITIAL_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), prod);
      }
    } else {
      // Overwrite/sync existing products in Firestore with the working Unsplash image URLs
      for (const docSnap of productsSnap.docs) {
        const data = docSnap.data();
        const firstImg = data.images?.[0] || '';
        if (!firstImg || firstImg.startsWith('/src/assets/images')) {
          const matching = INITIAL_PRODUCTS.find((p) => p.id === docSnap.id);
          if (matching) {
            await setDoc(
              doc(db, 'products', docSnap.id),
              {
                ...data,
                images: matching.images,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        }
      }
    }

    const articlesSnap = await getDocs(collection(db, 'articles'));
    if (articlesSnap.empty) {
      for (const art of INITIAL_ARTICLES) {
        await setDoc(doc(db, 'articles', art.id), art);
      }
    } else {
      for (const docSnap of articlesSnap.docs) {
        const data = docSnap.data();
        if (!data.coverImage || data.coverImage.startsWith('/src/assets/images')) {
          const matching = INITIAL_ARTICLES.find((a) => a.id === docSnap.id);
          if (matching) {
            await setDoc(
              doc(db, 'articles', docSnap.id),
              {
                ...data,
                coverImage: matching.coverImage,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        }
      }
    }
  } catch (error) {
    console.warn('Database seed check notice:', error);
  }
}

// Fetch or listen to all products
export function subscribeToProducts(callback: (products: Product[]) => void) {
  const colRef = collection(db, 'products');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Product);
      });
      callback(list.length > 0 ? list : INITIAL_PRODUCTS);
    },
    (err) => {
      console.warn('Using default catalog offline fallback due to listener:', err);
      callback(INITIAL_PRODUCTS);
    }
  );
}

// Fetch single product
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const d = await getDoc(doc(db, 'products', id));
    if (d.exists()) {
      return { ...d.data(), id: d.id } as Product;
    }
    const fallback = INITIAL_PRODUCTS.find((p) => p.id === id);
    return fallback || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `products/${id}`);
  }
}

// Save or Update Product
export async function saveProduct(product: Product): Promise<void> {
  try {
    await setDoc(doc(db, 'products', product.id), {
      ...product,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

// Delete Product
export async function deleteProduct(productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}

// Subscribe to articles
export function subscribeToArticles(callback: (articles: Article[]) => void) {
  const colRef = collection(db, 'articles');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Article[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as Article);
      });
      callback(list.length > 0 ? list : INITIAL_ARTICLES);
    },
    (err) => {
      console.warn('Using default articles offline fallback:', err);
      callback(INITIAL_ARTICLES);
    }
  );
}

// Save or Update Article
export async function saveArticle(article: Article): Promise<void> {
  try {
    await setDoc(doc(db, 'articles', article.id), {
      ...article,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `articles/${article.id}`);
  }
}

// Delete Article
export async function deleteArticle(articleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'articles', articleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `articles/${articleId}`);
  }
}

// Saved Items (Bookmarks)
export async function toggleSavedItem(userId: string, item: Omit<SavedItem, 'id' | 'createdAt'>): Promise<boolean> {
  const savedId = `${userId}_${item.itemId}`;
  const docRef = doc(db, 'savedItems', savedId);
  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await deleteDoc(docRef);
      return false; // Removed
    } else {
      await setDoc(docRef, {
        ...item,
        id: savedId,
        createdAt: new Date().toISOString(),
      });
      return true; // Added
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `savedItems/${savedId}`);
  }
}

export function subscribeToSavedItems(userId: string, callback: (items: SavedItem[]) => void) {
  const q = query(collection(db, 'savedItems'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items: SavedItem[] = [];
    snapshot.forEach((doc) => items.push({ ...doc.data(), id: doc.id } as SavedItem));
    callback(items);
  }, (err) => {
    console.warn('Saved items listener issue:', err);
    callback([]);
  });
}

// Investment Watchlist
export async function saveWatchlistItem(item: InvestmentWatchlistItem): Promise<void> {
  const docId = `${item.userId}_${item.symbol}`;
  try {
    await setDoc(doc(db, 'investmentWatchlists', docId), {
      ...item,
      id: docId,
      addedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `investmentWatchlists/${docId}`);
  }
}

export async function removeWatchlistItem(userId: string, symbol: string): Promise<void> {
  const docId = `${userId}_${symbol}`;
  try {
    await deleteDoc(doc(db, 'investmentWatchlists', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `investmentWatchlists/${docId}`);
  }
}

export function subscribeToWatchlist(userId: string, callback: (items: InvestmentWatchlistItem[]) => void) {
  const q = query(collection(db, 'investmentWatchlists'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items: InvestmentWatchlistItem[] = [];
    snapshot.forEach((doc) => items.push({ ...doc.data(), id: doc.id } as InvestmentWatchlistItem));
    callback(items);
  }, (err) => {
    console.warn('Watchlist listener issue:', err);
    callback([]);
  });
}
