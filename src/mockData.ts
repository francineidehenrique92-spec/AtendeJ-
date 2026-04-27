import { collection, doc, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { db } from './lib/firebase';

const MENU_ITEMS = [
  { name: 'Picanha Premium', price: 95.00, category: 'Carnes', description: '400g de picanha angus fatiada, acompanha farofa especial.', stock: 15, minStock: 5 },
  { name: 'Prime Rib', price: 120.00, category: 'Carnes', description: 'Corte nobre com osso, grelhado na parrilha.', stock: 10, minStock: 3 },
  { name: 'Hambúrguer GastroVoz', price: 42.00, category: 'Lanches', description: 'Blend de 180g, queijo cheddar, bacon caramelizado e maionese defumada.', stock: 30, minStock: 8 },
  { name: 'Batata Rústica', price: 32.00, category: 'Porções', description: 'Crocantes por fora e macias por dentro, com alecrim.', stock: 50, minStock: 15 },
  { name: 'Coca-Cola 350ml', price: 8.00, category: 'Bebidas', description: 'Lata gelada.', stock: 100, minStock: 24 },
  { name: 'Suco de Laranja Natural', price: 12.00, category: 'Bebidas', description: '500ml, espremido na hora.', stock: 40, minStock: 10 },
  { name: 'Cerveja Original 600ml', price: 16.00, category: 'Bebidas', description: 'Pilsen trincando.', stock: 80, minStock: 20 },
  { name: 'Guaraná Antarctica', price: 8.00, category: 'Bebidas', description: 'Lata gelada.', stock: 60, minStock: 12 },
  { name: 'Petit Gateau', price: 28.00, category: 'Sobremesas', description: 'Bolinho quente de chocolate com sorvete de baunilha.', stock: 20, minStock: 5 }
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
