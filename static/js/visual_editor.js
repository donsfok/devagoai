
// Visual Component Editor
class VisualEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.components = new Map();
        this.selectedComponent = null;
        this.initializeEditor();
    }

    initializeEditor() {
        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'visual-editor-toolbar';
        toolbar.innerHTML = `
            <button onclick="visualEditor.addComponent('text')">Add Text</button>
            <button onclick="visualEditor.addComponent('button')">Add Button</button>
            <button onclick="visualEditor.addComponent('input')">Add Input</button>
        `;
        this.container.appendChild(toolbar);

        // Create canvas
        const canvas = document.createElement('div');
        canvas.className = 'visual-editor-canvas';
        canvas.addEventListener('click', () => this.selectComponent(null));
        this.container.appendChild(canvas);

        // Create properties panel
        const properties = document.createElement('div');
        properties.className = 'visual-editor-properties';
        this.container.appendChild(properties);
    }

    addComponent(type) {
        const component = {
            id: `component-${Date.now()}`,
            type,
            properties: {
                x: 0,
                y: 0,
                width: 100,
                height: 30,
                text: 'New Component'
            }
        };

        this.components.set(component.id, component);
        this.renderComponent(component);
    }

    renderComponent(component) {
        const el = document.createElement('div');
        el.id = component.id;
        el.className = 'visual-editor-component';
        el.style.left = `${component.properties.x}px`;
        el.style.top = `${component.properties.y}px`;
        el.style.width = `${component.properties.width}px`;
        el.style.height = `${component.properties.height}px`;
        
        el.innerHTML = component.properties.text;
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectComponent(component);
        });

        // Make draggable
        el.draggable = true;
        el.addEventListener('dragstart', this.handleDragStart.bind(this));
        el.addEventListener('dragend', this.handleDragEnd.bind(this));

        document.querySelector('.visual-editor-canvas').appendChild(el);
    }

    selectComponent(component) {
        if (this.selectedComponent) {
            document.getElementById(this.selectedComponent.id)
                .classList.remove('selected');
        }

        this.selectedComponent = component;
        if (component) {
            document.getElementById(component.id)
                .classList.add('selected');
            this.showProperties(component);
        }
    }

    showProperties(component) {
        const panel = document.querySelector('.visual-editor-properties');
        panel.innerHTML = `
            <h3>Properties</h3>
            <label>
                Text
                <input type="text" value="${component.properties.text}"
                       onchange="visualEditor.updateProperty('text', this.value)">
            </label>
            <label>
                Width
                <input type="number" value="${component.properties.width}"
                       onchange="visualEditor.updateProperty('width', this.value)">
            </label>
            <label>
                Height
                <input type="number" value="${component.properties.height}"
                       onchange="visualEditor.updateProperty('height', this.value)">
            </label>
        `;
    }

    updateProperty(prop, value) {
        if (!this.selectedComponent) return;
        
        this.selectedComponent.properties[prop] = value;
        this.renderComponent(this.selectedComponent);
    }

    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
    }

    handleDragEnd(e) {
        const component = this.components.get(e.target.id);
        if (component) {
            component.properties.x = e.clientX - e.target.offsetWidth / 2;
            component.properties.y = e.clientY - e.target.offsetHeight / 2;
            this.renderComponent(component);
        }
    }
}

// Initialize editor
let visualEditor = null;
document.addEventListener('DOMContentLoaded', () => {
    visualEditor = new VisualEditor('visual-editor');
});
