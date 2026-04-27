import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../lib/firebase";
import { collection, doc, updateDoc, increment, getDocs, query, where } from "firebase/firestore";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function processInvoiceWithAI(text: string, margin: number = 2.5) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
    Analise o texto desta Nota Fiscal de fornecedor e extraia os produtos, quantidades e preços unitários.
    Retorne APENAS um JSON no formato:
    {
      "items": [
        { "name": "NOME PRODUTO", "qty": 10, "cost": 5.50 }
      ]
    }
    Texto da nota: ${text}
  `;

  const result = await model.generateContent(prompt);
  const response = JSON.parse(result.response.text());
  
  // Update inventory and prices
  for (const item of response.items) {
    const menusRef = collection(db, 'restaurants', 'default', 'menus', 'main', 'items');
    const q = query(menusRef, where("name", "==", item.name));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const menuDoc = snap.docs[0];
      await updateDoc(menuDoc.ref, {
        stock: increment(item.qty),
        costPrice: item.cost,
        price: item.cost * margin, // Automatic profit margin
        updatedAt: new Date().toISOString()
      });
    }
  }
  
  return response.items;
}

export async function decrementStock(items: { name: string, qty: number }[]) {
  for (const item of items) {
    const menusRef = collection(db, 'restaurants', 'default', 'menus', 'main', 'items');
    const q = query(menusRef, where("name", "==", item.name));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, {
        stock: increment(-item.qty)
      });
    }
  }
}

export function printThermalOrder(order: any) {
  console.log("---------------------------------");
  console.log("GASTROVOZ AI - ORDRE DE PRODUÇÃO");
  console.log(`MESA: ${order.tableNumber}`);
  console.log(`HORA: ${new Date().toLocaleTimeString()}`);
  console.log("---------------------------------");
  order.items.forEach((i: any) => {
    console.log(`${i.qty}x ${i.name}`);
    if (i.ponto) console.log(`   - Ponto: ${i.ponto}`);
    if (i.obs) i.obs.forEach((o: any) => console.log(`   - ${o}`));
  });
  console.log("---------------------------------");
  console.log("SISTEMA AUTOMÁTICO");
}
