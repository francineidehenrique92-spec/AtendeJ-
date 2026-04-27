import { collection, doc, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { db } from './lib/firebase';

const MENU_ITEMS = [
  { name: 'Picanha fatiada', price: 89.90, category: 'Carnes', description: 'Picanha angus fatiada no ponto desejado.', stock: 15, minStock: 5 },
  { name: 'Hambúrguer Gourmet', price: 42.00, category: 'Lanches', description: 'Blend de 180g, queijo cheddar, bacon e maionese artesanal.', stock: 30, minStock: 8 },
  { name: 'Batata Frita', price: 28.00, category: 'Acompanhamentos', description: 'Porção generosa de batatas crocantes.', stock: 50, minStock: 15 },
  { name: 'Coca-Cola 350ml', price: 7.50, category: 'Bebidas', description: 'Lata gelada.', stock: 100, minStock: 24 },
  { name: 'Cerveja Original', price: 14.00, category: 'Bebidas', description: 'Garrafa 600ml trincando.', stock: 80, minStock: 20 },
  { name: 'Suco de Laranja', price: 12.00, category: 'Bebidas', description: 'Natural, espremido na hora.', stock: 40, minStock: 10 }
];

export async function initializeMockData() {
  try {
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
  } catch (err) {
    console.error('Error initializing mock data:', err);
  }
}
