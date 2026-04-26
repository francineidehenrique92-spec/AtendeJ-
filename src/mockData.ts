import { collection, doc, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { db } from './lib/firebase';

const MENU_ITEMS = [
  { name: 'Picanha fatiada', price: 89.90, category: 'Carnes', description: 'Picanha angus fatiada no ponto desejado.' },
  { name: 'Hambúrguer Gourmet', price: 42.00, category: 'Lanches', description: 'Blend de 180g, queijo cheddar, bacon e maionese artesanal.' },
  { name: 'Batata Frita', price: 28.00, category: 'Acompanhamentos', description: 'Porção generosa de batatas crocantes.' },
  { name: 'Coca-Cola 350ml', price: 7.50, category: 'Bebidas', description: 'Lata gelada.' },
  { name: 'Cerveja Original', price: 14.00, category: 'Bebidas', description: 'Garrafa 600ml trincando.' },
  { name: 'Suco de Laranja', price: 12.00, category: 'Bebidas', description: 'Natural, espremido na hora.' }
];

export async function initializeMockData() {
  const tablesRef = collection(db, 'restaurants', 'default', 'tables');
  const snap = await getDocs(query(tablesRef, limit(1)));
  
  if (!snap.empty) return; // Already initialized

  const batch = writeBatch(db);

  // Initialize Tables
  for (let i = 1; i <= 12; i++) {
    const tableId = `table-${i}`;
    batch.set(doc(db, 'restaurants', 'default', 'tables', tableId), {
      number: i,
      status: 'free',
      updatedAt: new Date().toISOString()
    });
  }

  // Initialize Menu
  const menuRef = collection(db, 'restaurants', 'default', 'menus', 'main', 'items');
  MENU_ITEMS.forEach((item, index) => {
    batch.set(doc(menuRef, `item-${index}`), item);
  });

  await batch.commit();
  console.log('Mock data initialized');
}
