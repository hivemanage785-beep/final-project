import * as L from 'leaflet';

declare module 'leaflet' {
    function heatLayer(
        latlngs: Array<[number, number, number] | [number, number] | L.LatLng>,
        options?: any
    ): any;
}
