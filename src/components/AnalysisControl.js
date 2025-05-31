export class AnalysisControl {
    constructor() {
        this.element = this._createUI();
        this.onAnalyzeCallback = null;
    }

    _createUI() {
        const container = document.createElement('div');
        container.className = 'analysis-control';

        // 创建开始分析按钮
        const startButton = document.createElement('button');
        startButton.textContent = '开始分析';
        startButton.className = 'analyze-button';
        startButton.addEventListener('click', () => this._handleAnalyze());
        
        // 创建进度条
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        this.progressBar = progressBar;

        const progressText = document.createElement('span');
        progressText.className = 'progress-text';
        this.progressText = progressText;

        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);

        container.appendChild(startButton);
        container.appendChild(progressContainer);

        return container;
    }

    _handleAnalyze() {
        if (this.onAnalyzeCallback) {
            this.onAnalyzeCallback();
        }
    }

    onAnalyze(callback) {
        this.onAnalyzeCallback = callback;
    }

    updateProgress(progress, message = '') {
        this.progressBar.style.width = `${progress}%`;
        if (message) {
            this.progressText.textContent = message;
        } else {
            this.progressText.textContent = `${progress}%`;
        }
    }

    mount(parent) {
        parent.appendChild(this.element);
    }
}