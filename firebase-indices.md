# Índices do Firestore (Composite Indexes)

Para que as consultas complexas funcionem corretamente no Firebase, você deve criar os seguintes índices no Console do Firebase:

### 1. Pedidos por Mesa (Ordenados)
- **Coleção:** `restaurants/default/orders` (ou `orders` se usar caminho relativo)
- **Campos:**
  - `tableId` (Ascending)
  - `createdAt` (Descending)
- **Query correspondente:** `query(collection(db, 'orders'), where('tableId', '==', ...), orderBy('createdAt', 'desc'))`

### 2. Pedidos filtrados por Status e Mesa
- **Coleção:** `restaurants/default/orders`
- **Campos:**
  - `tableId` (Ascending)
  - `status` (In)
- **Query correspondente:** `query(collection(db, 'orders'), where('tableId', '==', ...), where('status', 'in', [...]))`

---

### Como criar os índices:
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Vá em **Firestore Database** -> **Índices** -> **Composto**.
3. Clique em **Criar Índice**.
4. Insira o ID da coleção (ex: `orders`) e adicione os campos conforme listado acima.
5. Aguarde o status mudar para "Ativo".
