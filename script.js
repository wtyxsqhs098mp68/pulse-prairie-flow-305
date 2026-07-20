let accumulatorData = {
    numbers: [],
    totalSum: 0,
    count: 0,
    average: 0
};

const numberWindow = document.getElementById('numberWindow');
const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');
const openLogBtn = document.getElementById('openLogBtn');
const exitBtn = document.getElementById('exitBtn');
const totalSumDisplay = document.getElementById('totalSum');
const countDisplay = document.getElementById('count');
const averageDisplay = document.getElementById('average');
const statusMessage = document.getElementById('statusMessage');

document.addEventListener('DOMContentLoaded', () => {
    updateDisplay();
    updateNumberWindow();
    numberWindow.focus();
});

startBtn.addEventListener('click', () => {
    processAllNumbersFromWindow();
});

numberWindow.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        await processCurrentLine();
        return;
    }

    if (!isAllowedKey(e)) {
        e.preventDefault();
    }
});

function isAllowedKey(e) {
    if (e.ctrlKey || e.metaKey) {
        return true;
    }

    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'];
    if (allowedKeys.includes(e.key)) {
        return true;
    }

    return /^\d$/.test(e.key) || e.key === '-' || e.key === '.';
}

async function processCurrentLine() {
    const lines = numberWindow.value.split(/\r?\n/);
    const currentLine = lines[lines.length - 1].trim();

    if (!currentLine) {
        showMessage('请输入数字后再回车。', 'error');
        return;
    }

    if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(currentLine)) {
        showMessage('请输入数字（可为负数和小数）。', 'error');
        return;
    }

    const value = Number.parseFloat(currentLine);
    if (Number.isNaN(value) || value < -10000000 || value > 10000000) {
        showMessage('请输入 -10000000 到 10000000 之间的数字。', 'error');
        return;
    }

    accumulatorData.numbers.push(value);
    accumulatorData.count = accumulatorData.numbers.length;
    accumulatorData.totalSum = accumulatorData.numbers.reduce((sum, num) => sum + num, 0);
    accumulatorData.average = accumulatorData.totalSum / accumulatorData.count;
    updateDisplay();
    updateNumberWindow();

    const fileResult = await appendNumberToFile(value);
    if (fileResult) {
        showMessage(`已累加 ${value}，并写入软件目录 add.txt。`, 'success');
    } else {
        showMessage('累加成功，但写入 add.txt 失败，请确认通过本地服务启动。', 'error');
    }
}

async function processAllNumbersFromWindow() {
    const lines = numberWindow.value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        showMessage('请先在左侧窗体输入数字。', 'error');
        return;
    }

    const parsedNumbers = [];
    for (const line of lines) {
        if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(line)) {
            showMessage(`存在无效数字：${line}`, 'error');
            return;
        }

        const value = Number.parseFloat(line);
        if (Number.isNaN(value) || value < -10000000 || value > 10000000) {
            showMessage(`超出范围：${line}（应在 -10000000 到 10000000）`, 'error');
            return;
        }
        parsedNumbers.push(value);
    }

    accumulatorData.numbers = parsedNumbers;
    accumulatorData.count = parsedNumbers.length;
    accumulatorData.totalSum = parsedNumbers.reduce((sum, num) => sum + num, 0);
    accumulatorData.average = accumulatorData.totalSum / accumulatorData.count;
    updateDisplay();
    updateNumberWindow();

    const written = await writeAllNumbersToFile(parsedNumbers);
    if (written) {
        showMessage(`已完成批量求和，并写入 add.txt（共 ${accumulatorData.count} 个数字）。`, 'success');
        return;
    }

    showMessage('批量求和成功，但写入 add.txt 失败，请确认本地服务已启动。', 'error');
}

function updateDisplay() {
    totalSumDisplay.textContent = accumulatorData.totalSum.toLocaleString();
    countDisplay.textContent = accumulatorData.count.toLocaleString();
    averageDisplay.textContent = accumulatorData.count > 0 ? accumulatorData.average.toFixed(2) : '0.00';
}

function updateNumberWindow() {
    numberWindow.value = accumulatorData.numbers.join('\n');
    if (numberWindow.value.length > 0) {
        numberWindow.value += '\n';
    }
    numberWindow.scrollTop = numberWindow.scrollHeight;
    numberWindow.focus();
}

async function appendNumberToFile(value) {
    const payload = JSON.stringify({ value });
    const targets = ['/api/append', 'http://127.0.0.1:3000/api/append'];

    for (const url of targets) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
            if (response.ok) {
                return true;
            }
        } catch (error) {
            // Try next target.
        }
    }

    try {
        const response = await fetch('http://localhost:3000/api/append', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function writeAllNumbersToFile(numbers) {
    const payload = JSON.stringify({ numbers });
    const targets = ['/api/write-all', 'http://127.0.0.1:3000/api/write-all', 'http://localhost:3000/api/write-all'];
    for (const url of targets) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
            if (response.ok) {
                return true;
            }
        } catch (error) {
            // Try next target.
        }
    }
    return false;
}

clearBtn.addEventListener('click', async () => {
    if (accumulatorData.count === 0) {
        showMessage('没有数据需要清空。', 'info');
        return;
    }

    accumulatorData = {
        numbers: [],
        totalSum: 0,
        count: 0,
        average: 0
    };
    updateDisplay();
    updateNumberWindow();

    showMessage('已清空左侧输入和本次统计。', 'success');
});

openLogBtn.addEventListener('click', async () => {
    const opened = await openAddFileInSoftwareDir();
    if (opened) {
        showMessage('已打开软件目录下的 add.txt。', 'success');
        return;
    }

    showMessage('打开 add.txt 失败，请确认本地服务已启动。', 'error');
});

async function openAddFileInSoftwareDir() {
    const targets = ['/api/open-add-file', 'http://127.0.0.1:3000/api/open-add-file', 'http://localhost:3000/api/open-add-file'];
    for (const url of targets) {
        try {
            const response = await fetch(url, { method: 'POST' });
            if (response.ok) {
                return true;
            }
        } catch (error) {
            // Try next target.
        }
    }
    return false;
}

exitBtn.addEventListener('click', () => {
    if (!confirm('确定要退出软件吗？')) {
        return;
    }

    window.close();
    setTimeout(() => {
        showMessage('浏览器限制自动关闭窗口，请手动关闭标签页。', 'info');
    }, 300);
});

function showMessage(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }, 3000);
}
