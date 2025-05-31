export class FileSelector {
    constructor() {
        this.borrowFiles = [];
        this.readerListFile = null;
        this.element = this._createUI();
        this.openDialog = null; // 将在初始化时设置
    }

    setOpenDialog(openDialog) {
        this.openDialog = openDialog;
    }

    _createUI() {
        const container = document.createElement('div');
        container.className = 'file-selector';

        // 创建借阅数据文件选择区域
        const borrowSection = document.createElement('div');
        borrowSection.className = 'file-section';
        
        const borrowLabel = document.createElement('label');
        borrowLabel.textContent = '借阅数据文件（可多选）：';
        
        const borrowButton = document.createElement('button');
        borrowButton.textContent = '选择借阅数据文件';
        borrowButton.className = 'file-select-button';
        borrowButton.addEventListener('click', () => this._selectBorrowFiles());

        borrowSection.appendChild(borrowLabel);
        borrowSection.appendChild(borrowButton);

        // 创建读者清单文件选择区域
        const readerSection = document.createElement('div');
        readerSection.className = 'file-section';
        
        const readerLabel = document.createElement('label');
        readerLabel.textContent = '读者清单文件：';
        
        const readerButton = document.createElement('button');
        readerButton.textContent = '选择读者清单文件';
        readerButton.className = 'file-select-button';
        readerButton.addEventListener('click', () => this._selectReaderFile());

        readerSection.appendChild(readerLabel);
        readerSection.appendChild(readerButton);

        // 文件列表显示区域
        const fileList = document.createElement('div');
        fileList.className = 'file-list';
        this.fileList = fileList;

        container.appendChild(borrowSection);
        container.appendChild(readerSection);
        container.appendChild(fileList);

        return container;
    }

    async _selectBorrowFiles() {
        if (!this.openDialog) {
            console.error('Open dialog 未初始化');
            return;
        }
        try {
            const selected = await this.openDialog({
                multiple: true,
                filters: [{
                    name: 'Excel文件',
                    extensions: ['xlsx', 'xls']
                }],
                title: '选择借阅数据文件'
            });

            if (selected && selected.length > 0) {
                this.borrowFiles = selected.map(path => ({
                    name: path.split(/[/\\]/).pop(), // 获取文件名
                    path: path
                }));
                this._updateFileList();
            }
        } catch (error) {
            console.error('选择借阅数据文件失败:', error);
            this._showError('选择借阅数据文件失败: ' + error.message);
        }
    }

    async _selectReaderFile() {
        if (!this.openDialog) {
            console.error('Open dialog 未初始化');
            return;
        }
        try {
            const selected = await this.openDialog({
                multiple: false,
                filters: [{
                    name: 'Excel文件',
                    extensions: ['xlsx', 'xls']
                }],
                title: '选择读者清单文件'
            });

            if (selected) {
                this.readerListFile = {
                    name: selected.split(/[/\\]/).pop(), // 获取文件名
                    path: selected
                };
                this._updateFileList();
            }
        } catch (error) {
            console.error('选择读者清单文件失败:', error);
            this._showError('选择读者清单文件失败: ' + error.message);
        }
    }

    _updateFileList() {
        this.fileList.innerHTML = '';
        
        if (this.borrowFiles.length > 0) {
            const borrowTitle = document.createElement('h4');
            borrowTitle.textContent = '已选择的借阅数据文件：';
            this.fileList.appendChild(borrowTitle);
            
            const borrowList = document.createElement('ul');
            this.borrowFiles.forEach(file => {
                const li = document.createElement('li');
                li.textContent = file.name;
                li.title = file.path; // 显示完整路径作为提示
                borrowList.appendChild(li);
            });
            this.fileList.appendChild(borrowList);
        }

        if (this.readerListFile) {
            const readerTitle = document.createElement('h4');
            readerTitle.textContent = '已选择的读者清单文件：';
            this.fileList.appendChild(readerTitle);
            
            const readerList = document.createElement('ul');
            const li = document.createElement('li');
            li.textContent = this.readerListFile.name;
            li.title = this.readerListFile.path; // 显示完整路径作为提示
            readerList.appendChild(li);
            this.fileList.appendChild(readerList);
        }
    }

    _showError(message) {
        // 创建错误提示
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = 'red';
        errorDiv.style.marginTop = '10px';
        
        // 清除之前的错误消息
        const existingError = this.fileList.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        this.fileList.appendChild(errorDiv);
        
        // 3秒后自动移除错误消息
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    getFiles() {
        return {
            borrowFiles: this.borrowFiles.map(f => f.path), // 返回文件路径数组
            readerListFile: this.readerListFile ? this.readerListFile.path : null // 返回文件路径
        };
    }

    isValid() {
        return this.borrowFiles.length > 0 && this.readerListFile !== null;
    }

    mount(parent) {
        parent.appendChild(this.element);
    }
}