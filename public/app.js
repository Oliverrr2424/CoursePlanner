document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('course-form');
    const input = document.getElementById('course-input');
    const datalist = document.getElementById('course-list');
    const networkContainer = document.getElementById('mynetwork');
    const loadingIndicator = document.getElementById('loading-indicator');
    const courseInfoContainer = document.getElementById('course-info');

    // Fetch course list for autocomplete
    fetch('/api/courses')
        .then(res => res.json())
        .then(courses => {
            courses.forEach(c => {
                const option = document.createElement('option');
                option.value = `${c.code} - ${c.title}`;
                datalist.appendChild(option);
            });
        })
        .catch(err => console.error('Failed to load course list:', err));

    const getNetworkOptions = () => ({
        nodes: {
            shape: 'box',
            font: {
                size: 16,
                face: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                color: 'white'
            },
            borderWidth: 2,
            shadow: {
                enabled: true,
                color: 'rgba(0,0,0,0.2)',
                size: 5,
                x: 2,
                y: 2
            },
            margin: 10,
            widthConstraint: {
                minimum: 80,
                maximum: 120
            }
        },
        edges: {
            width: 2,
            font: {
                align: 'middle',
                size: 12,
                color: '#666'
            },
            arrows: {
                to: { enabled: true, scaleFactor: 1.2 }
            },
            smooth: {
                enabled: true,
                type: 'dynamic',
                roundness: 0.5
            }
        },
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -2000,
                springConstant: 0.04,
                springLength: 150
            },
            minVelocity: 0.75,
            stabilization: {
                enabled: true,
                iterations: 100,
                updateInterval: 25
            }
        },
        layout: {
            hierarchical: {
                enabled: true,
                levelSeparation: 150,
                nodeSpacing: 120,
                treeSpacing: 200,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true,
                direction: 'UD',
                sortMethod: 'directed'
            },
        },
        groups: {
            root: { 
                color: { background: '#ff9900', border: '#e6870a' }, 
                font: { color: 'white', size: 18 },
                borderWidth: 3
            },
            explored: { 
                color: { background: '#0071e3', border: '#0056b3' }, 
                font: { color: 'white' }
            },
            unexplored: { 
                color: { background: '#d2d2d7', border: '#a1a1a6' },
                font: { color: '#333' }
            },
            exclusion: { 
                color: { background: '#f56342', border: '#d4472a' }, 
                font: { color: 'white' }
            },
        },
        interaction: {
            hover: true,
            hoverConnectedEdges: true,
            selectConnectedEdges: false
        }
    });

    let network = null;
    let currentGraphData = null;
    let originalGraphData = null;
    let currentFilters = {
        years: [],
        departments: []
    };

    // 创建图表的函数
    const createNetwork = (data, animate = false) => {
        // Destroy old network if it exists
        if (network) {
            network.destroy();
        }

        // 添加动画效果
        if (animate) {
            networkContainer.style.opacity = '0';
            networkContainer.style.transform = 'scale(0.9)';
        }

        network = new vis.Network(networkContainer, data, getNetworkOptions());
        
        // 动画显示
        if (animate) {
            setTimeout(() => {
                networkContainer.style.transition = 'all 0.5s ease-out';
                networkContainer.style.opacity = '1';
                networkContainer.style.transform = 'scale(1)';
            }, 100);
        }

        // 添加节点点击事件
        network.on("click", function (params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = data.nodes.find(n => n.id === nodeId);
                if (node) {
                    document.getElementById('info-code').innerText = node.courseData.code;
                    document.getElementById('info-title').innerText = node.courseData.title;
                    document.getElementById('info-description').innerText = node.courseData.description;
                    courseInfoContainer.classList.remove('hidden');
                }
            } else {
                courseInfoContainer.classList.add('hidden');
            }
        });

        // 网络稳定后进行布局调整
        network.on("stabilizationIterationsDone", function () {
            network.setOptions({physics: {enabled: false}});
        });
    };

    // 导航到课程的函数
    const navigateToCourse = async (courseCode) => {
        // 更新输入框
        input.value = courseCode;
        
        // 显示加载指示器
        loadingIndicator.classList.remove('hidden');
        courseInfoContainer.classList.add('hidden');

        try {
            const response = await fetch(`/api/graph/${courseCode}`);
            if (!response.ok) {
                throw new Error(`Course ${courseCode} not found or server error.`);
            }
            const data = await response.json();
            currentGraphData = data;
            originalGraphData = JSON.parse(JSON.stringify(data)); // 深拷贝

            createNetwork(data, true);
            
            // 显示网络并隐藏加载指示器
            networkContainer.style.display = 'block';
            loadingIndicator.classList.add('hidden');

        } catch (error) {
            console.error('Error fetching graph data:', error);
            alert(error.message);
            loadingIndicator.classList.add('hidden');
        }
    };

    // 表单提交事件
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        let courseCode = input.value.trim();
        // If user selected from datalist with format "CODE - Title"
        if (courseCode.includes(' - ')) {
            courseCode = courseCode.split(' - ')[0].trim();
        }
        if (!courseCode) return;

        await navigateToCourse(courseCode);
    });

    // 获取课程年级
    const getCourseLevel = (courseCode) => {
        const match = courseCode.match(/[A-Z]{3}(\d)/);
        return match ? parseInt(match[1]) : 1;
    };

    // 获取课程学科
    const getCourseDepartment = (courseCode) => {
        const dept = courseCode.substring(0, 3);
        const knownDepts = ['CSC', 'MAT', 'PHY', 'STA', 'ACT', 'CHM', 'BIO', 'ECO'];
        return knownDepts.includes(dept) ? dept : 'other';
    };

    // 检查课程是否通过过滤器
    const passesFilter = (courseCode) => {
        if (currentFilters.years.length === 0 && currentFilters.departments.length === 0) {
            return true;
        }

        const level = getCourseLevel(courseCode);
        const dept = getCourseDepartment(courseCode);

        const passesYear = currentFilters.years.length === 0 || 
                          currentFilters.years.includes(level.toString()) ||
                          (level >= 5 && currentFilters.years.includes('5'));
        
        const passesDept = currentFilters.departments.length === 0 || 
                          currentFilters.departments.includes(dept);

        return passesYear && passesDept;
    };

    // 应用过滤器
    const applyFilters = () => {
        if (!originalGraphData) return;

        // 过滤节点
        const filteredNodes = originalGraphData.nodes.filter(node => passesFilter(node.id));
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

        // 过滤边，只保留两端都存在的边
        const filteredEdges = originalGraphData.edges.filter(edge => 
            filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to)
        );

        // 检查是否有断链
        const hasBreaks = originalGraphData.edges.length > filteredEdges.length;
        
        // 显示/隐藏警告
        const warningElement = document.getElementById('filter-warning');
        if (hasBreaks && (currentFilters.years.length > 0 || currentFilters.departments.length > 0)) {
            warningElement.classList.remove('hidden');
        } else {
            warningElement.classList.add('hidden');
        }

        // 更新当前图表数据
        currentGraphData = {
            nodes: filteredNodes,
            edges: filteredEdges
        };

        // 重新渲染图表
        createNetwork(currentGraphData, true);
    };

    // 清除过滤器
    const clearFilters = () => {
        currentFilters.years = [];
        currentFilters.departments = [];
        
        // 隐藏警告
        document.getElementById('filter-warning').classList.add('hidden');
        
        // 恢复原始数据
        if (originalGraphData) {
            currentGraphData = JSON.parse(JSON.stringify(originalGraphData));
            createNetwork(currentGraphData, true);
        }
    };

    // 苹果风格多选组件类
    class AppleMultiSelect {
        constructor(selectElement, tagsElement) {
            this.selectElement = selectElement;
            this.tagsElement = tagsElement;
            this.selectedValues = [];
            this.isOpen = false;
            
            this.dropdown = selectElement.querySelector('.select-dropdown');
            this.optionsList = selectElement.querySelector('.options-list');
            this.options = selectElement.querySelectorAll('.option-item');
            
            this.init();
        }
        
        init() {
            // 点击下拉框
            this.dropdown.addEventListener('click', () => {
                this.toggle();
            });
            
            // 点击选项
            this.options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOption(option.dataset.value, option.textContent);
                });
            });
            
            // 点击外部关闭
            document.addEventListener('click', (e) => {
                if (!this.selectElement.contains(e.target)) {
                    this.close();
                }
            });
            
            this.updateDropdownText();
        }
        
        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }
        
        open() {
            this.isOpen = true;
            this.selectElement.classList.add('open');
            this.optionsList.classList.add('show');
        }
        
        close() {
            this.isOpen = false;
            this.selectElement.classList.remove('open');
            this.optionsList.classList.remove('show');
        }
        
        toggleOption(value, text) {
            const index = this.selectedValues.indexOf(value);
            
            if (index > -1) {
                // 移除选项
                this.selectedValues.splice(index, 1);
                this.updateOption(value, false);
            } else {
                // 添加选项
                this.selectedValues.push(value);
                this.updateOption(value, true);
            }
            
            this.updateTags();
            this.updateDropdownText();
        }
        
        updateOption(value, selected) {
            const option = Array.from(this.options).find(opt => opt.dataset.value === value);
            if (option) {
                if (selected) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            }
        }
        
        updateTags() {
            this.tagsElement.innerHTML = '';
            
            this.selectedValues.forEach(value => {
                const option = Array.from(this.options).find(opt => opt.dataset.value === value);
                if (option) {
                    const tag = document.createElement('div');
                    tag.className = 'option-tag';
                    tag.innerHTML = `
                        ${option.textContent}
                        <button class="remove-btn" data-value="${value}">×</button>
                    `;
                    
                    tag.querySelector('.remove-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.toggleOption(value, option.textContent);
                    });
                    
                    this.tagsElement.appendChild(tag);
                }
            });
        }
        
        updateDropdownText() {
            if (this.selectedValues.length === 0) {
                this.dropdown.textContent = this.selectElement.id === 'year-select' ? 'Select year levels...' : 'Select departments...';
            } else {
                this.dropdown.textContent = `${this.selectedValues.length} selected`;
            }
        }
        
        clear() {
            this.selectedValues = [];
            this.options.forEach(option => option.classList.remove('selected'));
            this.updateTags();
            this.updateDropdownText();
        }
        
        getValues() {
            return [...this.selectedValues];
        }
    }
    
    // 初始化多选组件
    const yearMultiSelect = new AppleMultiSelect(
        document.getElementById('year-select'),
        document.getElementById('year-tags')
    );
    
    const deptMultiSelect = new AppleMultiSelect(
        document.getElementById('dept-select'),
        document.getElementById('dept-tags')
    );

    // 过滤器事件监听
    document.getElementById('apply-filters').addEventListener('click', () => {
        currentFilters.years = yearMultiSelect.getValues();
        currentFilters.departments = deptMultiSelect.getValues();
        
        applyFilters();
    });

    document.getElementById('clear-filters').addEventListener('click', () => {
        yearMultiSelect.clear();
        deptMultiSelect.clear();
        clearFilters();
    });

    // 导航按钮点击事件
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'navigate-btn') {
            const courseCode = document.getElementById('info-code').innerText;
            if (courseCode) {
                navigateToCourse(courseCode);
            }
        }
    });
}); 