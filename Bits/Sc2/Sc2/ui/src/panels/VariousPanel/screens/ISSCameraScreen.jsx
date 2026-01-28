function ISSCameraScreen() {
    return (
        <div class="iss-camera-screen">
            <iframe
                src="https://www.youtube.com/embed/aB1yRz0HhdY?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=aB1yRz0HhdY"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="ISS Live Camera"
            ></iframe>
        </div>
    );
}

export default ISSCameraScreen;
