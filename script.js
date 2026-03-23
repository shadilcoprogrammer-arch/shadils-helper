let userDetails = {};
let questions = [];
let currentQuestionIndex = 0;
let score = 0;

window.onload = () => {
    const savedUser = localStorage.getItem('studentHelperUser');
    if (savedUser) {
        userDetails = JSON.parse(savedUser);
        switchScreen('home-screen');
        document.getElementById('greeting-text').innerText = `Hi ${userDetails.name}!`;
    }
};

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function saveUserDetails() {
    const name = document.getElementById('user-name').value.trim();
    const standard = document.getElementById('user-standard').value.trim();
    const purpose = document.getElementById('user-purpose').value;
    const days = document.getElementById('user-days').value;

    if (!name || !standard || !days) {
        alert("Please fill in all details");
        return;
    }

    userDetails = { name, standard, purpose, days };
    localStorage.setItem('studentHelperUser', JSON.stringify(userDetails));

    document.getElementById('greeting-text').innerText = `Hi ${name}!`;
    switchScreen('home-screen');
}

async function generateQuestions() {
    const topic = document.getElementById('learning-topic').value.trim();
    const errorMsg = document.getElementById('error-msg');
    const btn = document.getElementById('start-btn');
    const loader = document.getElementById('loader');

    if (!topic) {
        errorMsg.innerText = "Please enter a topic.";
        return;
    }

    errorMsg.innerText = "";
    btn.querySelector('span').style.display = 'none';
    loader.style.display = 'block';
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, purpose: userDetails.purpose })
        });
        
        const data = await response.json();
        if (data.success && data.data && data.data.levels) {
            questions = [];
            data.data.levels.forEach(levelObj => {
                // gemini provides 'questions' array inside each level
                if (levelObj.questions) {
                    levelObj.questions.forEach(q => {
                        q.level = levelObj.level;
                        questions.push(q);
                    });
                }
            });

            if (questions.length === 0) throw new Error("No questions generated.");

            currentQuestionIndex = 0;
            score = 0;
            switchScreen('question-screen');
            loadQuestion();
        } else {
            throw new Error(data.error || "Failed to parse questions. Please clear or rewrite prompt if you see a JSON failure.");
        }
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Error generating questions. " + error.message;
    } finally {
        btn.querySelector('span').style.display = 'inline';
        loader.style.display = 'none';
    }
}

let selectedOption = null;

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    document.getElementById('question-progress').innerText = `Question ${currentQuestionIndex + 1}/${questions.length}`;
    document.getElementById('difficulty-badge').innerText = `Level ${q.level}`;
    document.getElementById('question-text').innerText = q.question;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    document.getElementById('answer-reveal').style.display = 'none';
    document.getElementById('show-answer-btn').style.display = 'block';
    document.getElementById('next-q-btn').style.display = 'none';
    
    selectedOption = null;

    if (q.options && q.options.length > 0) {
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.onclick = () => selectOption(btn, opt);
            optionsContainer.appendChild(btn);
        });
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'short-answer-input';
        input.placeholder = 'Type your answer...';
        input.oninput = (e) => { selectedOption = e.target.value; }
        optionsContainer.appendChild(input);
    }
}

function selectOption(btnElement, optText) {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btnElement.classList.add('selected');
    selectedOption = optText;
}

function showAnswer() {
    const q = questions[currentQuestionIndex];
    const answerReveal = document.getElementById('answer-reveal');
    
    document.getElementById('correct-answer-text').innerText = q.answer;
    answerReveal.style.display = 'block';
    
    document.getElementById('show-answer-btn').style.display = 'none';
    document.getElementById('next-q-btn').style.display = 'block';

    let isCorrect = false;
    if (q.options && q.options.length > 0) {
        if (selectedOption && selectedOption.toLowerCase() === q.answer.toLowerCase()) {
            isCorrect = true;
        }
        
        document.querySelectorAll('.option-btn').forEach(b => {
            if (b.innerText.toLowerCase() === q.answer.toLowerCase()) {
                b.classList.add('correct');
            } else if (b.classList.contains('selected')) {
                b.classList.add('wrong');
            }
        });
    } else {
        if (selectedOption && (q.answer.toLowerCase().includes(selectedOption.toLowerCase()) || selectedOption.toLowerCase().includes(q.answer.toLowerCase()))) {
            isCorrect = true;
            answerReveal.style.backgroundColor = 'var(--success)';
            answerReveal.style.color = '#2b7a5f';
        } else {
            answerReveal.style.backgroundColor = '#ffcccc';
            answerReveal.style.color = '#d13232';
        }
    }

    if (isCorrect) score++;
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        loadQuestion();
    } else {
        showProgress();
    }
}

function showProgress() {
    switchScreen('progress-screen');
    document.getElementById('final-score').innerText = `${score} / ${questions.length}`;
    document.getElementById('accuracy-percent').innerText = `${Math.round((score / questions.length) * 100)}%`;
}

function goToCertificate() {
    switchScreen('certificate-screen');
    document.getElementById('cert-name-label').innerText = userDetails.name || "Student";
    document.getElementById('cert-topic-label').innerText = document.getElementById('learning-topic').value || "Selected Topic";
    document.getElementById('cert-score-label').innerText = `${Math.round((score / questions.length) * 100)}%`;
    document.getElementById('cert-class-label').innerText = userDetails.standard || "N/A";
}

function downloadCertificate() {
    const certElement = document.getElementById('certificate-content');
    html2canvas(certElement, {
        scale: 3, // higher resolution for perfect print
        onclone: function (clonedDoc) {
            // Force a wide, landscape layout so the text isn't compressed into mobile bounds
            const appBox = clonedDoc.querySelector('.app-container');
            if (appBox) appBox.style.maxWidth = '1000px';
            
            const cert = clonedDoc.getElementById('certificate-content');
            cert.style.width = '800px'; // standard landscape width
            cert.style.minHeight = '560px'; // proper height ratio
            cert.style.margin = '0 auto';
        }
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jspdf.jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('Student_Helper_Certificate.pdf');
    });
}

function goHome() {
    switchScreen('home-screen');
}
