document.addEventListener('DOMContentLoaded', () => {
    const providerSelect = document.getElementById('provider-select');
    const modelSelect = document.getElementById('model-select');
    const promptSelect = document.getElementById('prompt-select');
    const newPromptArea = document.getElementById('new-prompt-area');
    const newPromptNameInput = document.getElementById('new-prompt-name');
    const newPromptTextInput = document.getElementById('new-prompt-text');
    const savePromptButton = document.getElementById('save-prompt-button');
    const temperatureSlider = document.getElementById('temperature-slider');
    const temperatureValueSpan = document.getElementById('temperature-value');
    const maxTokensSlider = document.getElementById('max-tokens-slider');
    const maxTokensValueSpan = document.getElementById('max-tokens-value');
    const resetButton = document.getElementById('reset-button');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatWindow = document.getElementById('chat-window');

    // Default System Prompts
    const defaultSystemPrompts = {
        "Helpful AI": "You are a helpful AI assistant. Provide useful, precise, and correct answers to user queries.",
        "Proofreader": `You are a meticulous proofreader and editor with an exceptional command of the English language. Your task is to carefully review the provided draft text and suggest improvements to enhance clarity, flow, grammar, and overall impact—without altering the original intent.

        Editing Process:
        - Understand the Context – Read through the entire draft to grasp its overall message, structure, and tone before making any edits.
        - Line-by-Line Edits – Review the text in detail, focusing on:
            - Spelling, grammar, and punctuation errors
            - Awkward phrasing or unclear sentence structures
            - Redundant or unnecessary words
            - Inconsistent or incorrect formatting
            - Replacing complex words with simpler alternatives that a 5th grader can understand
        - Enhance Readability – Use appropriate transition words and phrases to improve the logical flow between ideas.
        - Provide Feedback – Suggest refinements to strengthen the draft’s clarity, impact, and persuasiveness.

        Editing Constraints:
        - Maintain the original author’s voice and intent.
        - DO NOT delete any sentences.
        - DO NOT add new sentences.

        Output Format:
        Summary: Provide a brief summary of the draft’s key points and overall message.`,
        "Instructor": "You are an instructor who explains topics succinctly and systematically."
    };
    let customSystemPrompts = {}; // For custom prompts, consider using localStorage for persistence
    let systemPromptText = defaultSystemPrompts["Helpful AI"];
    let conversationMessages = [];

    // Function to update model options based on provider
    function updateModelOptions() {
        const selectedProvider = providerSelect.value;
        const modelOptions = modelSelect.querySelectorAll('optgroup');
        modelOptions.forEach(optgroup => {
            if (optgroup.dataset.provider === selectedProvider) {
                optgroup.style.display = 'block';
            } else {
                optgroup.style.display = 'none';
            }
        });
    }

    updateModelOptions();
    providerSelect.addEventListener('change', updateModelOptions);

    // Handle prompt selection
    promptSelect.addEventListener('change', () => {
        if (promptSelect.value === 'add-new-prompt') {
            newPromptArea.style.display = 'block';
        } else {
            newPromptArea.style.display = 'none';
            if (defaultSystemPrompts[promptSelect.value]) {
                systemPromptText = defaultSystemPrompts[promptSelect.value];
            } else if (customSystemPrompts[promptSelect.value]) {
                systemPromptText = customSystemPrompts[promptSelect.value];
            }
        }
    });

    savePromptButton.addEventListener('click', () => {
        const newName = newPromptNameInput.value.trim();
        const newText = newPromptTextInput.value.trim();
        if (newName && newText) {
            customSystemPrompts[newName] = newText;
            // Update prompt select options
            let newOption = document.createElement('option');
            newOption.value = newName;
            newOption.textContent = newName;
            promptSelect.add(newOption, promptSelect.options[promptSelect.options.length -1]); // Insert before 'Add New System Prompt'
            promptSelect.value = newName; // Select the new prompt
            systemPromptText = newText;
            newPromptArea.style.display = 'none';
            newPromptNameInput.value = '';
            newPromptTextInput.value = '';
            alert(`Custom prompt "${newName}" added and selected.`);
        } else {
            alert('Please enter both prompt name and text.');
        }
    });


    // Update temperature and max tokens display
    temperatureSlider.addEventListener('input', () => {
        temperatureValueSpan.textContent = temperatureSlider.value;
    });

    maxTokensSlider.addEventListener('input', () => {
        maxTokensValueSpan.textContent = maxTokensSlider.value;
    });

    resetButton.addEventListener('click', () => {
        conversationMessages = [];
        chatWindow.innerHTML = ''; // Clear chat window
        // Add a default assistant message after reset
        addMessageToChat('assistant', "Hello! How can I assist you today?");
    });

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const userMessage = userInput.value.trim();
        if (userMessage) {
            addMessageToChat('user', userMessage);
            userInput.value = '';
            conversationMessages.push({ role: 'user', content: userMessage });

            const selectedProvider = providerSelect.value;
            const selectedModel = modelSelect.value;
            const temperature = parseFloat(temperatureSlider.value);
            const maxTokens = parseInt(maxTokensSlider.value);

            // Add thinking message
            addThinkingMessage();

            let apiResponsePromise;
            if (selectedProvider === 'ChatGPT') {
                apiResponsePromise = callOpenAIApi(systemPromptText, conversationMessages, selectedModel, temperature, maxTokens);
            } else if (selectedProvider === 'Groq') {
                apiResponsePromise = callGroqApi(systemPromptText, conversationMessages, selectedModel, temperature, maxTokens);
            } else if (selectedProvider === 'Google') {
                apiResponsePromise = callGoogleApi(systemPromptText, conversationMessages, selectedModel, temperature, maxTokens);
            }

            apiResponsePromise.then(response => {
                removeThinkingMessage();
                if (response) {
                    addMessageToChat('assistant', response);
                    conversationMessages.push({ role: 'assistant', content: response });
                } else {
                    addMessageToChat('assistant', "Sorry, I encountered an error processing your request.");
                }
            }).catch(error => {
                removeThinkingMessage();
                console.error("API call failed:", error);
                addMessageToChat('assistant', "Sorry, I encountered an error connecting to the service.");
            });
        }
    }


    function addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${role}-message`);
        const messageContentDiv = document.createElement('div');
        messageContentDiv.classList.add('message-content');

        if (role === 'assistant') {
            messageContentDiv.innerHTML = marked.parse(content); // Render markdown for assistant messages
        } else {
            messageContentDiv.textContent = content;
        }

        messageDiv.appendChild(messageContentDiv);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom
    }

    // Thinking message element and functions
    let thinkingMessageElement = null;

    function addThinkingMessage() {
        thinkingMessageElement = document.createElement('div');
        thinkingMessageElement.classList.add('message', 'assistant-message', 'thinking-message');
        thinkingMessageElement.innerHTML = '<div class="message-content">Thinking... <div class="spinner"></div></div>';
        chatWindow.appendChild(thinkingMessageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function removeThinkingMessage() {
        if (thinkingMessageElement && thinkingMessageElement.parentNode === chatWindow) {
            chatWindow.removeChild(thinkingMessageElement);
            thinkingMessageElement = null;
        }
    }


    // API Call Functions
    async function callOpenAIApi(systemPrompt, messages, model, temperature, maxTokens) {
        const apiUrl = "https://api.openai.com/v1/chat/completions";
        const apiMessages = [{ role: "system", content: systemPrompt }, ...messages];
        const data = {
            model: model,
            messages: apiMessages,
            temperature: temperature,
            max_tokens: maxTokens
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}` // From config.js
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const completion = await response.json();
            return completion.choices[0].message.content;
        } catch (error) {
            console.error("Error calling OpenAI API:", error);
            return `Error calling ChatGPT API: ${error.message}`;
        }
    }

    async function callGroqApi(systemPrompt, messages, model, temperature, maxTokens) {
        const apiUrl = "https://api.groq.com/openai/v1/chat/completions";
        const apiMessages = [{ role: "system", content: systemPrompt }, ...messages];
        const data = {
            model: model,
            messages: apiMessages,
            temperature: temperature,
            max_tokens: maxTokens
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqApiKey}` // From config.js
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const completion = await response.json();
            return completion.choices[0].message.content;
        } catch (error) {
            console.error("Error calling Groq API:", error);
            return `Error calling Groq API: ${error.message}`;
        }
    }
    
    async function callGoogleApi(systemPrompt, messages, model, temperature, maxTokens) {
        const googleApiKey = "AIzaSyC2u-MF58wFMicH8Rb4gJMr1-kvYSE-qAA"; // From config.js
        const baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        const endpoint = `${baseUrl}/models/${model}:generateContent?key=${googleApiKey}`;

        // Get the latest user message
        const latestUserMessage = messages.filter(msg => msg.role === 'user').pop();
        const userText = latestUserMessage ? latestUserMessage.content : ""; // Use latest user message, or empty string if no user message yet.

        const payload = {
            "contents": [{
                "parts": [{"text": userText.trim()}] // Send ONLY user's text as part
            }]
            // Temperature and maxOutputTokens can be added if supported by the endpoint and needed
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                // Log more detailed error info if response is not ok
                const errorDetails = await response.json(); // Try to get error details from Google API response
                console.error("Google API Error Response:", errorDetails);
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            const reply = await response.json();
            if(reply.candidates && reply.candidates[0].content && reply.candidates[0].content.parts && reply.candidates[0].content.parts[0].text) {
                return reply.candidates[0].content.parts[0].text;
            } else {
                throw new Error("Unexpected API response format from Google.");
            }

        } catch (error) {
            console.error("Error calling Google API:", error);
            return `Error calling Google API: ${error.message}`;
        }
    }
});