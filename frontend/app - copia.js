document.addEventListener('DOMContentLoaded', () => {
    // --- Obtener Elementos ---
    const imageUploader = document.getElementById('imageUploader');
    const uploadBox = document.getElementById('uploadBox');
    const initialImage = document.getElementById('initialImage');
    const resultImage = document.getElementById('resultImage');
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const upscaleBtn = document.getElementById('upscaleBtn');
    const downloadLink = document.getElementById('downloadLink');
    const strengthSlider = document.getElementById('strengthSlider');
    const strengthValue = document.getElementById('strengthValue');
    const loader = document.getElementById('loader');
    const resultSection = document.getElementById('result-section');
    const resultActions = document.getElementById('resultActions');
    const carouselWrapper = document.getElementById('carousel-wrapper');
    const resultsCarousel = document.getElementById('results-carousel');
    const setInitialBtn = document.getElementById('set-initial-btn');

    // --- Variables de Estado ---
    let initialImageSource = null; // Puede ser base64 o una URL
    let resultHistory = [];
    let currentResultUrl = null;

    // --- Lógica de la Interfaz ---
    strengthSlider.addEventListener('input', () => {
        strengthValue.textContent = strengthSlider.value;
    });

    uploadBox.addEventListener('click', () => imageUploader.click());

    imageUploader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewInitialImage(reader.result);
        };
        reader.readAsDataURL(file);
    });

    // --- Lógica de Botones ---
    generateBtn.addEventListener('click', async () => {
        if (!initialImageSource || !promptInput.value) {
            alert('Por favor, sube una imagen y escribe una descripción.');
            return;
        }
        loader.style.display = 'block';
        generateBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:5001/api/redesign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: initialImageSource,
                    prompt: promptInput.value,
                    strength: parseFloat(strengthSlider.value)
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            const data = await response.json();

            resultHistory.push(data.newImage);
            updateCarousel();
            selectThumbnail(data.newImage);

        } catch (error) {
            handleApiError(error);
        } finally {
            loader.style.display = 'none';
            generateBtn.disabled = false;
        }
    });

    upscaleBtn.addEventListener('click', async () => {
        if (!currentResultUrl) return;
        loader.style.display = 'block';
        upscaleBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:5001/api/upscale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: currentResultUrl }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            const data = await response.json();

            const index = resultHistory.indexOf(currentResultUrl);
            if (index > -1) {
                resultHistory[index] = data.newImage;
            }
            updateCarousel();
            selectThumbnail(data.newImage);

        } catch (error) {
            handleApiError(error, "mejorar");
        } finally {
            loader.style.display = 'none';
            upscaleBtn.disabled = false;
        }
    });

    setInitialBtn.addEventListener('click', () => {
        if (!currentResultUrl) return;
        setNewInitialImage(currentResultUrl);
    });

    // --- Funciones Auxiliares ---
    function setNewInitialImage(imageSource) {
        initialImageSource = imageSource;
        initialImage.src = imageSource;
        resultSection.style.display = 'none';
        carouselWrapper.style.display = 'none';
        resultHistory = [];
        resultsCarousel.innerHTML = '';
    }

    function updateCarousel() {
        resultsCarousel.innerHTML = '';

        // Añadir la imagen inicial al principio del carrusel
        const initialThumb = document.createElement('img');
        initialThumb.src = initialImageSource;
        initialThumb.onclick = () => selectThumbnail(initialImageSource);
        resultsCarousel.appendChild(initialThumb);

        resultHistory.forEach(url => {
            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.onclick = () => selectThumbnail(url);
            resultsCarousel.appendChild(thumb);
        });
        carouselWrapper.style.display = 'block';
        resultSection.style.display = 'block';
    }

    function selectThumbnail(url) {
        currentResultUrl = url;
        resultImage.src = url;
        downloadLink.href = url;
        resultActions.style.display = 'flex';

        Array.from(resultsCarousel.children).forEach(img => {
            // Comparar el final de la URL para manejar timestamps de caché
            const cleanSrc = img.src.split('?')[0];
            const cleanUrl = url.split('?')[0];
            img.classList.toggle('selected', cleanSrc === cleanUrl);
        });
    }

    function handleApiError(error, action = "generar") {
        console.error('Error:', error);
        alert(`No se pudo ${action} la imagen: ${error.message}`);
        resultSection.style.display = 'block';
        resultImage.src = "https://placehold.co/600x600/eee/ccc?text=Error";
    }
});
