document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('courseSearchInput');
    const suggestions = document.getElementById('suggestions');
    let allCourses = [];
    const networkContainer = document.getElementById('mynetwork');
    const loadingIndicator = document.getElementById('loading-indicator');
    const courseInfoContainer = document.getElementById('course-info');
    const searchModeToggle = document.getElementById('search-mode-toggle');
    const searchModeLabel = document.getElementById('search-mode-label');

    // 搜索模式状态
    let searchMode = 'prerequisites'; // 'prerequisites' or 'postrequisites'
    let network = null;
    let currentGraphData = null;
    let originalGraphData = null;
    let selectedNode = null;
    let currentFilters = {
        years: [],
        departments: []
    };

    // 获取课程列表
    fetch('/api/courses')
        .then(res => res.json())
        .then(courses => {
            allCourses = courses;
            // 绑定输入事件以显示实时建议
            searchInput.addEventListener('input', () => {
                const term = searchInput.value.trim().toUpperCase();
                if (!term) {
                    suggestions.classList.add('hidden');
                    return;
                }
                const matches = allCourses.filter(c => c.code.startsWith(term)).slice(0,5);
                if (matches.length === 0) {
                    suggestions.classList.add('hidden');
                    return;
                }
                suggestions.innerHTML = matches.map(m => `<div class="suggestion-item" data-code="${m.code}">${m.code} - ${m.title}</div>`).join('');
                suggestions.classList.remove('hidden');
            });

            suggestions.addEventListener('click', (e) => {
                const item = e.target.closest('.suggestion-item');
                if (item) {
                    searchInput.value = item.dataset.code;
                    suggestions.classList.add('hidden');
                }
            });
        })
        .catch(err => console.error('Failed to load course list:', err));

    const resolveCourseCode = (code) => {
        const clean = code.toUpperCase().replace(/\s+/g, '');
        const match = allCourses.find(c => c.code.startsWith(clean));
        return match ? match.code : clean;
    };

    // 计算关系强度
    const calculateRelationshipStrength = (node, rootNode, allNodes, allEdges) => {
        if (node.id === rootNode.id) return 1.0;
        
        // 计算路径距离
        const pathDistance = Math.abs(node.level - rootNode.level);
        
        // 计算连接强度（直接连接 vs 间接连接）
        const directConnection = allEdges.some(edge => 
            (edge.from === rootNode.id && edge.to === node.id) ||
            (edge.from === node.id && edge.to === rootNode.id)
        );
        
        // 计算共同连接数
        const rootConnections = allEdges.filter(edge => 
            edge.from === rootNode.id || edge.to === rootNode.id
        ).length;
        
        const nodeConnections = allEdges.filter(edge => 
            edge.from === node.id || edge.to === node.id
        ).length;
        
        const commonConnections = allEdges.filter(edge => 
            (edge.from === rootNode.id && edge.to === node.id) ||
            (edge.from === node.id && edge.to === rootNode.id)
        ).length;
        
        // 关系强度计算
        let strength = 1.0;
        
        // 路径距离衰减
        strength *= Math.pow(0.7, pathDistance);
        
        // 直接连接奖励
        if (directConnection) strength *= 1.5;
        
        // 连接密度奖励
        const connectionDensity = commonConnections / Math.max(rootConnections, nodeConnections, 1);
        strength *= (1 + connectionDensity);
        
        return Math.min(strength, 1.0);
    };

    // 智能节点定位和样式
    const getIntelligentNodeStyle = (node, rootNode, allNodes, allEdges) => {
        const strength = calculateRelationshipStrength(node, rootNode, allNodes, allEdges);
        
        // 基于关系强度确定颜色深浅
        const baseColors = {
            root: { r: 255, g: 153, b: 0 },
            explored: { r: 0, g: 113, b: 227 },
            unexplored: { r: 210, g: 210, b: 215 },
            exclusion: { r: 245, g: 99, b: 66 }
        };
        
        const baseColor = baseColors[node.group] || baseColors.unexplored;
        
        // 根据强度调整颜色
        const alpha = 0.2 + (strength * 0.8); // 根据距离调整透明度
        const color = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
        const borderColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`;
        
        // 根据强度调整大小
        const baseSize = node.group === 'root' ? 120 : 100;
        const size = baseSize * (0.8 + strength * 0.4); // 80% 到 120%
        
        return {
            color: { background: color, border: borderColor },
            size: size,
            font: { 
                size: node.group === 'root' ? 18 : (14 + strength * 4),
                color: strength > 0.5 ? 'white' : '#333',
                face: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            },
            borderWidth: node.group === 'root' ? 4 : (2 + strength),
            shadow: {
                enabled: true,
                color: `rgba(0,0,0,${0.1 + strength * 0.2})`,
                size: 5 + strength * 3,
                x: 2,
                y: 2
            },
            margin: 10 + strength * 5,
            widthConstraint: {
                minimum: 80,
                maximum: size
            }
        };
    };

    // 优化网络布局配置
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
            margin: 15,
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
            },
            color: {
                color: '#000000',
                opacity: 0.8
            }
        },
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -5000,
                springConstant: 0.1,
                springLength: 300,
                damping: 0.4
            },
            hierarchicalRepulsion: {
                nodeDistance: 200
            },
            minVelocity: 0.5,
            maxVelocity: 50,
            stabilization: {
                enabled: true,
                iterations: 300,
                updateInterval: 25,
                fit: true
            }
        },
        layout: {
            hierarchical: {
                enabled: true,
                levelSeparation: 250,
                nodeSpacing: 300,
                treeSpacing: 400,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true,
                direction: 'UD',
                sortMethod: 'directed',
                shakeTowards: 'leaves'
            },
            improvedLayout: true
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
            selectConnectedEdges: false,
            tooltipDelay: 200
        }
    });

    // 创建图表的函数
    const createNetwork = (data, animate = false) => {
        if (network) {
            network.destroy();
        }

        if (animate) {
            networkContainer.style.opacity = '0';
            networkContainer.style.transform = 'scale(0.9)';
        }

        // 应用智能样式
        const rootNode = data.nodes.find(n => n.group === 'root');
        if (rootNode) {
            data.nodes.forEach(node => {
                const style = getIntelligentNodeStyle(node, rootNode, data.nodes, data.edges);
                Object.assign(node, style);
            });
        }

        // 优化边的样式 - 根据关系强度调整线条粗细
        data.edges.forEach(edge => {
            const fromNode = data.nodes.find(n => n.id === edge.from);
            const toNode = data.nodes.find(n => n.id === edge.to);
            
            if (fromNode && toNode && rootNode) {
                // 计算边的强度（基于两端节点的关系强度）
                const fromStrength = calculateRelationshipStrength(fromNode, rootNode, data.nodes, data.edges);
                const toStrength = calculateRelationshipStrength(toNode, rootNode, data.nodes, data.edges);
                const edgeStrength = (fromStrength + toStrength) / 2;
                
                // 线条粗细：关系越强，线条越粗（越近越粗）
                edge.width = 1 + (edgeStrength * 4); // 1-5px
                edge.color = {
                    color: '#000000',
                    opacity: 0.2 + (edgeStrength * 0.8)
                };
            }
        });

        network = new vis.Network(networkContainer, data, getNetworkOptions());
        
        if (animate) {
            setTimeout(() => {
                networkContainer.style.transition = 'all 0.5s ease-out';
                networkContainer.style.opacity = '1';
                networkContainer.style.transform = 'scale(1)';
            }, 100);
        }

        // 添加节点点击事件
        network.on("click", function (params) {
            hideNodeMenu();
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = data.nodes.find(n => n.id === nodeId);
                if (node) {
                    selectedNode = node;
                    showNodeMenu(params.pointer.DOM);
                }
            } else {
                courseInfoContainer.classList.add('hidden');
            }
        });

        // 添加悬停事件
        network.on("hoverNode", function (params) {
            const node = data.nodes.find(n => n.id === params.node);
            if (node) {
                showTooltip(node, params.event.center);
            }
        });

        network.on("blurNode", function (params) {
            hideTooltip();
        });

        // 网络稳定后确保根节点居中
        network.on("stabilizationIterationsDone", function () {
            setTimeout(() => {
                // 确保根节点居中显示
                if (rootNode) {
                    network.focus(rootNode.id, {
                        scale: 1.2,
                        animation: {
                            duration: 1000,
                            easingFunction: 'easeInOutQuad'
                        }
                    });
                }
                
                // 重新调整网络以适应容器
                network.fit({
                    animation: {
                        duration: 1000,
                        easingFunction: 'easeInOutQuad'
                    }
                });
                
                // 确保网络图完全填充容器
                network.setOptions({
                    physics: {enabled: false},
                    layout: {
                        hierarchical: {
                            enabled: true,
                            levelSeparation: 250,
                            nodeSpacing: 300,
                            treeSpacing: 400,
                            blockShifting: true,
                            edgeMinimization: true,
                            parentCentralization: true,
                            direction: 'UD',
                            sortMethod: 'directed',
                            shakeTowards: 'leaves'
                        }
                    }
                });
            }, 500);
        });
    };

    // 显示课程信息
    const showCourseInfo = (node) => {
        document.getElementById('info-code').innerText = node.courseData.code;
        document.getElementById('info-title').innerText = node.courseData.title;
        document.getElementById('info-description').innerText = node.courseData.description;
        
        // 显示关系强度
        const rootNode = currentGraphData.nodes.find(n => n.group === 'root');
        if (rootNode) {
            const strength = calculateRelationshipStrength(node, rootNode, currentGraphData.nodes, currentGraphData.edges);
            const strengthText = strength > 0.8 ? 'Strong' : strength > 0.5 ? 'Medium' : 'Weak';
            document.getElementById('info-relationship').innerText = `Relationship: ${strengthText} (${Math.round(strength * 100)}%)`;
        }
        
        courseInfoContainer.classList.remove('hidden');
    };

    // 显示工具提示
    const showTooltip = (node, position) => {
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;
        
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <strong>${node.courseData.code}</strong><br>
                ${node.courseData.title}
            </div>
        `;
        
        tooltip.style.left = position.x + 'px';
        tooltip.style.top = (position.y - 60) + 'px';
        tooltip.classList.remove('hidden');
    };

    // 隐藏工具提示
    const hideTooltip = () => {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.classList.add('hidden');
        }
    };

    const nodeMenu = document.getElementById('node-menu');
    const showNodeMenu = (position) => {
        if (!nodeMenu) return;
        nodeMenu.style.left = position.x + 'px';
        nodeMenu.style.top = position.y + 'px';
        nodeMenu.classList.add('show');
        nodeMenu.classList.remove('hidden');
    };

    const hideNodeMenu = () => {
        if (nodeMenu) {
            nodeMenu.classList.remove('show');
            nodeMenu.classList.add('hidden');
        }
    };

    // 切换搜索模式
    const toggleSearchMode = () => {
        searchMode = searchMode === 'prerequisites' ? 'postrequisites' : 'prerequisites';
        searchModeLabel.textContent = searchMode === 'prerequisites' ? 'Prerequisites' : 'Postrequisites';
        searchModeToggle.classList.toggle('active');
        
        // 更新输入框提示
        searchInput.placeholder = searchMode === 'prerequisites'
            ? 'Enter course code to see prerequisites...'
            : 'Enter course code to see postrequisites...';
    };

    // 导航到课程的函数
    const navigateToCourse = async (courseCode) => {
        searchInput.value = courseCode;
        loadingIndicator.classList.remove('hidden');
        courseInfoContainer.classList.add('hidden');

        try {
            const endpoint = searchMode === 'prerequisites' 
                ? `/api/graph/${courseCode}` 
                : `/api/postrequisites/${courseCode}`;
                
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Course ${courseCode} not found or server error.`);
            }
            const data = await response.json();
            currentGraphData = data;
            originalGraphData = JSON.parse(JSON.stringify(data));

            createNetwork(data, true);
            
            networkContainer.style.display = 'block';
            loadingIndicator.classList.add('hidden');

        } catch (error) {
            console.error('Error fetching graph data:', error);
            alert(error.message);
            loadingIndicator.classList.add('hidden');
        }
    };

    // 表单提交事件
    searchInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            let code = resolveCourseCode(searchInput.value.trim());
            searchInput.value = code;
            if (!code) return;
            await navigateToCourse(code);
        }
    });

    // 搜索模式切换事件
    searchModeToggle.addEventListener('click', toggleSearchMode);

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
        if (nodeMenu && !nodeMenu.contains(e.target) && !e.target.classList.contains('vis-node')) {
            hideNodeMenu();
        }
        if (e.target && e.target.id === 'node-info-btn') {
            hideNodeMenu();
            if (selectedNode) {
                showCourseInfo(selectedNode);
            }
        }
        if (e.target && e.target.id === 'node-graph-btn') {
            hideNodeMenu();
            if (selectedNode) {
                navigateToCourse(selectedNode.id);
            }
        }
    });

    // 搜索模式切换
    const prerequisiteModeBtn = document.getElementById('prerequisiteMode');
    const postrequisiteModeBtn = document.getElementById('postrequisiteMode');
    let currentSearchMode = 'prerequisites';

    prerequisiteModeBtn.addEventListener('click', () => {
        currentSearchMode = 'prerequisites';
        prerequisiteModeBtn.classList.add('active');
        postrequisiteModeBtn.classList.remove('active');
        updateSearchPlaceholder();
    });

    postrequisiteModeBtn.addEventListener('click', () => {
        currentSearchMode = 'postrequisites';
        postrequisiteModeBtn.classList.add('active');
        prerequisiteModeBtn.classList.remove('active');
        updateSearchPlaceholder();
    });

    function updateSearchPlaceholder() {
        const searchInput = document.getElementById('courseSearchInput');
        if (currentSearchMode === 'prerequisites') {
            searchInput.placeholder = '例如: CSC209H1 (搜索前置课程)';
        } else {
            searchInput.placeholder = '例如: CSC209H1 (搜索后置课程)';
        }
    }

    // 高级搜索功能
    const advancedSearchBtn = document.getElementById('advancedSearchBtn');
    const relationResults = document.getElementById('relationResults');
    const directCourseList = document.getElementById('directCourseList');
    const indirectCourseList = document.getElementById('indirectCourseList');

    advancedSearchBtn.addEventListener('click', async () => {
        let courseCode = document.getElementById('courseSearchInput').value.trim();
        courseCode = resolveCourseCode(courseCode);
        document.getElementById('courseSearchInput').value = courseCode;
        const relationType = document.getElementById('relationTypeSelect').value;

        if (!courseCode) {
            showNotification('请输入课程代码', 'error');
            return;
        }

        try {
            showNotification('搜索中...', 'info');
            
            const response = await fetch(`/api/course-relations/${courseCode}?type=${relationType}`);
            const data = await response.json();

            if (response.ok) {
                displayRelationResults(data);
                relationResults.classList.remove('hidden');
            } else {
                showNotification(data.error || '搜索失败', 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            showNotification('搜索出错，请重试', 'error');
        }
    });

    function displayRelationResults(data) {
        const { course, results } = data;
        
        // 显示直属关系
        directCourseList.innerHTML = '';
        if (results.direct && results.direct.length > 0) {
            results.direct.forEach(courseItem => {
                const courseElement = createCourseElement(courseItem, 'direct');
                directCourseList.appendChild(courseElement);
            });
        } else {
            directCourseList.innerHTML = '<p class="no-results">暂无直属关系课程</p>';
        }

        // 显示非直属关系
        indirectCourseList.innerHTML = '';
        if (results.indirect && results.indirect.length > 0) {
            results.indirect.forEach(courseItem => {
                const courseElement = createCourseElement(courseItem, 'indirect');
                indirectCourseList.appendChild(courseElement);
            });
        } else {
            indirectCourseList.innerHTML = '<p class="no-results">暂无非直属关系课程</p>';
        }

        showNotification(`找到 ${results.direct.length + results.indirect.length} 门相关课程`, 'success');
    }

    function createCourseElement(courseItem, type) {
        const div = document.createElement('div');
        div.className = `course-item ${type}`;
        div.innerHTML = `
            <div class="course-code">${courseItem.code}</div>
            <div class="course-title">${courseItem.title}</div>
            <div class="course-relation">${courseItem.relation}</div>
        `;
        
        div.addEventListener('click', () => {
            // 点击课程项时搜索该课程
            document.getElementById('courseSearchInput').value = courseItem.code;
            // 触发图形搜索
            searchCourse(courseItem.code);
        });
        
        return div;
    }

    // 标签页切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // 更新按钮状态
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新内容显示
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabName}Results`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // 初始化搜索占位符
    updateSearchPlaceholder();

    window.addEventListener('resize', () => {
        if (network) {
            network.fit();
        }
    });
});