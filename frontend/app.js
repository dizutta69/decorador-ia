document.addEventListener('DOMContentLoaded', () => {
    // --- Obtener Elementos ---
    const imageUploader = document.getElementById('imageUploader');
    const uploadBox = document.getElementById('uploadBox');
    const mainImage = document.getElementById('mainImage');
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const upscaleBtn = document.getElementById('upscaleBtn');
    const downloadLink = document.getElementById('downloadLink');
    const strengthSlider = document.getElementById('strengthSlider');
    const strengthValue = document.getElementById('strengthValue');
    const loader = document.getElementById('loader');
    const resultActions = document.getElementById('resultActions');
    const carouselWrapper = document.getElementById('carousel-wrapper');
    const initialThumbContainer = document.getElementById('initial-thumb-container');
    const resultsCarousel = document.getElementById('results-carousel');
    const setInitialBtn = document.getElementById('set-initial-btn');

    // --- Variables de Estado ---
    let initialImageSource = null;
    let resultHistory = [];
    let selectedImageUrl = null;

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
        if (!selectedImageUrl || selectedImageUrl === initialImageSource) return;
        loader.style.display = 'block';
        upscaleBtn.disabled = true;

        try {
            const response = await fetch('http://localhost:5001/api/upscale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: selectedImageUrl }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            const data = await response.json();

            const index = resultHistory.indexOf(selectedImageUrl);
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
        if (!selectedImageUrl || selectedImageUrl === initialImageSource) return;

        const allImages = [initialImageSource, ...resultHistory];
        const newHistory = allImages.filter(url => url !== selectedImageUrl);

        initialImageSource = selectedImageUrl;
        resultHistory = newHistory;

        updateCarousel();
        selectThumbnail(initialImageSource);
    });

    // --- Funciones Auxiliares ---
    function setNewInitialImage(imageSource) {
        initialImageSource = imageSource;
        selectThumbnail(imageSource);
        carouselWrapper.style.display = 'none';
        resultHistory = [];
        resultsCarousel.innerHTML = '';
    }

    function updateCarousel() {
        initialThumbContainer.innerHTML = '';
        resultsCarousel.innerHTML = '';

        const initialThumb = document.createElement('img');
        initialThumb.src = initialImageSource;
        initialThumb.onclick = () => selectThumbnail(initialImageSource);
        initialThumbContainer.appendChild(initialThumb);

        resultHistory.forEach(url => {
            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.onclick = () => selectThumbnail(url);
            resultsCarousel.appendChild(thumb);
        });
        carouselWrapper.style.display = 'block';
    }

    function selectThumbnail(url) {
        selectedImageUrl = url;
        mainImage.src = url;
        downloadLink.href = url;

        resultActions.style.display = 'flex';
        upscaleBtn.style.display = (url !== initialImageSource && url.startsWith('http')) ? 'inline-block' : 'none';

        document.querySelectorAll('#carousel-wrapper img').forEach(img => {
            const cleanSrc = img.src.split('?')[0];
            const cleanUrl = url.split('?')[0];
            img.classList.toggle('selected', cleanSrc === cleanUrl);
        });
    }

    function handleApiError(error, action = "generar") {
        console.error('Error:', error);
        alert(`No se pudo ${action} la imagen: ${error.message}`);
    }
});
