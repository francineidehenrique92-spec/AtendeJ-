import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const VOICE_ORDER_PROMPT = `
Você é o motor de inteligência de um SaaS de restaurante de alta performance. Sua função é processar a fala de garçons e transformá-la em comandos operacionais puros.

CONTEXTO OPERACIONAL:
Entrada: Transcrição bruta de áudio (pode conter ruídos e correções de fala).
Saída: JSON estrito, sem Markdown, sem explicações.

REGRAS DE NEGÓCIO:
1. Correção Dinâmica: Se o usuário disser "X, não, mude para Y", ignore o item X e registre apenas o Y.
2. Status da Mesa: Identifique se é um "novo_pedido", "cancelamento", "fechamento_conta" ou "chamada_gerente".
3. Normalização: Converta gírias para termos técnicos (ex: "breja" -> "Cerveja", "refri" -> "Refrigerante").
4. Identificação de Faltas: Se um item exige ponto (carne) ou acompanhamento e não foi mencionado, adicione uma flag "pendencia": "perguntar_detalhes".

ESTRUTURA DO JSON ESPERADA:
{
  "header": { "mesa": integer, "tipo_acao": "string" },
  "itens": [
    { "produto": "string", "qtd": integer, "obs": ["string"], "ponto": "string" }
  ],
  "flags": { "urgente": boolean, "pendencia": "string" }
}

Exemplo de entrada: "Mesa 8, traz duas Original gelada e um filé com fritas, mas o filé tem que ser bem passado. Ah, cancela uma cerveja, deixa só uma."
Exemplo de saída:
{
  "header": { "mesa": 8, "tipo_acao": "novo_pedido" },
  "itens": [
    { "produto": "Cerveja Original", "qtd": 1, "obs": ["gelada"] },
    { "produto": "Filé com Fritas", "qtd": 1, "ponto": "bem passado" }
  ],
  "flags": { "urgente": false, "pendencia": null }
}
`;

export async function processVoiceCommand(transcript: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `${VOICE_ORDER_PROMPT}\n\nINPUT: "${transcript}"`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text().trim();
  
  try {
    // Basic cleanup in case JSON is wrapped in markdown
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", text);
    throw new Error("Erro ao processar comando de voz");
  }
}
