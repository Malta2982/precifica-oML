// Este comando garante que a extensão abra a aba sempre que o ícone for clicado
chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL("index.html");
  chrome.tabs.create({ url });
});

// Log de depuração para você ver se ele carregou
console.log("Background.js da Maminfo carregado com sucesso!");