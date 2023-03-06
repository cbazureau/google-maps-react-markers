import { element, string, shape, number, object, node, oneOfType, arrayOf, func, bool, oneOf } from 'prop-types';
import React, { useState, useEffect, useRef, useMemo, Children, isValidElement, useCallback, forwardRef } from 'react';
import { createPortal } from 'react-dom';

const useScript = (script = {
  src: '',
  attributes: {},
  callbacks: {
    onLoadCallback: null,
    onErrorCallback: null
  },
  elementIdToAppend: null
}, forcedStatus = undefined) => {
  const [status, setStatus] = useState(script.src ? 'loading' : 'idle');
  useEffect(() => {
    var _script$callbacks, _script$callbacks2;
    if (forcedStatus) {
      setStatus(forcedStatus);
      return () => {};
    }
    if (!script.src) {
      setStatus('idle');
      return;
    }
    let scriptToAdd = document.querySelector(`script[src="${script.src}"]`);
    if (!scriptToAdd) {
      scriptToAdd = document.createElement('script');
      scriptToAdd.src = script.src;
      scriptToAdd.async = true;
      scriptToAdd.setAttribute('data-status', 'loading');
      script.attributes && Object.entries(script.attributes).length > 0 ? Object.entries(script.attributes).map(([key, value]) => scriptToAdd.setAttribute(key, value)) : null;
      if (script.elementIdToAppend && document.getElementById(script.elementIdToAppend)) {
        document.getElementById(script.elementIdToAppend).appendChild(scriptToAdd);
      } else {
        document.body.appendChild(scriptToAdd);
      }
      const setAttributeFromEvent = event => {
        scriptToAdd.setAttribute('data-status', event.type === 'load' ? 'ready' : 'error');
      };
      scriptToAdd.addEventListener('load', setAttributeFromEvent);
      scriptToAdd.addEventListener('error', setAttributeFromEvent);
    } else {
      const currentScriptStatus = scriptToAdd.getAttribute('data-status');
      switch (currentScriptStatus) {
        case 'load':
        case 'ready':
          (_script$callbacks = script.callbacks) !== null && _script$callbacks !== void 0 && _script$callbacks.onLoadCallback ? script.callbacks.onLoadCallback() : null;
          break;
        case 'error':
          (_script$callbacks2 = script.callbacks) !== null && _script$callbacks2 !== void 0 && _script$callbacks2.onErrorCallback ? script.callbacks.onErrorCallback() : null;
          break;
      }
      setStatus(currentScriptStatus);
    }
    const setStateFromEvent = event => {
      var _script$callbacks3, _script$callbacks4;
      event.type === 'load' ? (_script$callbacks3 = script.callbacks) !== null && _script$callbacks3 !== void 0 && _script$callbacks3.onLoadCallback ? script.callbacks.onLoadCallback() : null : (_script$callbacks4 = script.callbacks) !== null && _script$callbacks4 !== void 0 && _script$callbacks4.onErrorCallback ? script.callbacks.onErrorCallback() : null;
      setStatus(event.type === 'load' ? 'ready' : 'error');
    };
    scriptToAdd.addEventListener('load', setStateFromEvent);
    scriptToAdd.addEventListener('error', setStateFromEvent);
    return () => {
      if (scriptToAdd) {
        scriptToAdd.removeEventListener('load', setStateFromEvent);
        scriptToAdd.removeEventListener('error', setStateFromEvent);
      }
    };
  }, [script, forcedStatus, status]);
  return status;
};

const useGoogleMaps = ({
  apiKey,
  libraries: _libraries = [],
  loadScriptExternally: _loadScriptExternally = false,
  status: _status = 'idle',
  callback
}) => {
  if (typeof window !== "undefined") window.googleMapsCallback = callback;
  const script = apiKey ? {
    src: `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=googleMapsCallback&libraries=${_libraries === null || _libraries === void 0 ? void 0 : _libraries.join(',')}`,
    attributes: {
      id: 'googleMapsApi'
    }
  } : {
    src: `https://maps.googleapis.com/maps/api/js?callback=googleMapsCallback&libraries=${_libraries === null || _libraries === void 0 ? void 0 : _libraries.join(',')}`,
    attributes: {
      id: 'googleMapsApi'
    }
  };
  return useScript(script, _loadScriptExternally ? _status : undefined);
};

const isArraysEqualEps = (arrayA, arrayB, eps) => {
  if (arrayA && arrayB) {
    for (let i = 0; i !== arrayA.length; ++i) {
      if (Math.abs(arrayA[i] - arrayB[i]) > eps) {
        return false;
      }
    }
    return true;
  }
  return false;
};

const useMemoCompare = (next, compare) => {
  const previousRef = useRef();
  const previous = previousRef.current;
  const isEqual = compare(previous, next);
  useEffect(() => {
    if (!isEqual) {
      previousRef.current = next;
    }
  });
  return isEqual ? previous : next;
};

const createOverlay = ({
  container,
  pane,
  position,
  maps
}) => {
  class Overlay extends maps.OverlayView {
    constructor(container, _pane, position) {
      super();
      this.onAdd = () => {
        const pane = this.getPanes()[this.pane];
        pane === null || pane === void 0 ? void 0 : pane.classList.add('google-map-markers-overlay');
        pane === null || pane === void 0 ? void 0 : pane.appendChild(this.container);
      };
      this.draw = () => {
        const projection = this.getProjection();
        const point = projection.fromLatLngToDivPixel(this.position);
        if (point === null) return;
        this.container.style.transform = `translate(${point.x}px, ${point.y}px)`;
      };
      this.onRemove = () => {
        if (this.container.parentNode !== null) {
          this.container.parentNode.removeChild(this.container);
        }
      };
      this.container = container;
      this.pane = _pane;
      this.position = position;
    }
  }
  return new Overlay(container, pane, position);
};
createOverlay.propTypes = {
  container: element.isRequired,
  pane: string.isRequired,
  position: shape({
    lat: number.isRequired,
    lng: number.isRequired
  }).isRequired,
  maps: object.isRequired
};

const OverlayView = ({
  position,
  pane: _pane = 'floatPane',
  map,
  maps,
  zIndex,
  children
}) => {
  const container = useMemo(() => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    return div;
  }, []);
  const overlay = useMemo(() => {
    return createOverlay({
      container,
      pane: _pane,
      position,
      maps
    });
  }, [container, maps, _pane, position]);
  const childrenProps = useMemoCompare(children === null || children === void 0 ? void 0 : children.props, (prev, next) => {
    return prev && prev.lat === next.lat && prev.lng === next.lng;
  });
  useEffect(() => {
    if (!overlay.map) {
      overlay === null || overlay === void 0 ? void 0 : overlay.setMap(map);
      return () => {
        overlay === null || overlay === void 0 ? void 0 : overlay.setMap(null);
      };
    }
  }, [map, childrenProps]);
  useEffect(() => {
    container.style.zIndex = `${zIndex}`;
  }, [zIndex, container]);
  return /*#__PURE__*/createPortal(children, container);
};
OverlayView.defaultProps = {
  zIndex: 0
};
OverlayView.propTypes = {
  pane: string,
  position: shape({
    lat: number.isRequired,
    lng: number.isRequired
  }).isRequired,
  map: object.isRequired,
  maps: object.isRequired,
  zIndex: number,
  children: node.isRequired
};

const MapMarkers = ({
  children,
  map,
  maps
}) => {
  const markers = useMemo(() => {
    if (!map || !maps) return [];
    return Children.map(children, child => {
      if ( /*#__PURE__*/isValidElement(child)) {
        const latLng = {
          lat: child.props.lat,
          lng: child.props.lng
        };
        const zIndex = child.props.zIndex || undefined;
        return /*#__PURE__*/React.createElement(OverlayView, {
          position: latLng,
          map: map,
          maps: maps,
          zIndex: zIndex
        }, child);
      }
    });
  }, [children, map, maps]);
  return /*#__PURE__*/React.createElement("div", null, markers);
};
MapMarkers.propTypes = {
  children: node.isRequired,
  map: object,
  maps: object.isRequired
};

const EPS = 0.00001;
const MapComponent = ({
  children,
  style,
  defaultCenter,
  defaultZoom,
  onGoogleApiLoaded,
  onChange,
  options
}) => {
  const mapRef = useRef(null);
  const prevBoundsRef = useRef(null);
  const [map, setMap] = useState(null);
  const [maps, setMaps] = useState(null);
  const [googleApiCalled, setGoogleApiCalled] = useState(false);
  const onIdle = useCallback(() => {
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    const centerLatLng = map.getCenter();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const boundsArray = [sw.lng(), sw.lat(), ne.lng(), ne.lat()];
    if (!isArraysEqualEps(boundsArray, prevBoundsRef.current, EPS)) {
      if (onChange) {
        onChange({
          zoom,
          center: [centerLatLng.lng(), centerLatLng.lat()],
          bounds
        });
      }
      prevBoundsRef.current = boundsArray;
    }
  }, [map, onChange]);
  useEffect(() => {
    if (mapRef.current && !map) {
      setMap(new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        ...options
      }));
      setMaps(window.google.maps);
    }
  }, [defaultCenter, defaultZoom, map, mapRef, options]);
  useEffect(() => {
    if (map) {
      if (!googleApiCalled) {
        onGoogleApiLoaded({
          map,
          maps,
          ref: mapRef.current
        });
        setGoogleApiCalled(true);
      }
      window.google.maps.event.clearListeners(map, 'idle');
      window.google.maps.event.addListener(map, 'idle', onIdle);
    }
  }, [googleApiCalled, map, maps, onChange, onGoogleApiLoaded, onIdle]);
  useEffect(() => {
    return () => {
      if (map) {
        window.google.maps.event.clearListeners(map, 'idle');
      }
    };
  }, [map]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    ref: mapRef,
    style: style,
    className: "google-map"
  }), children && map && maps && /*#__PURE__*/React.createElement(MapMarkers, {
    map: map,
    maps: maps
  }, children));
};
MapComponent.defaultProps = {
  style: {
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    margin: 0,
    padding: 0,
    position: 'absolute'
  },
  onGoogleApiLoaded: () => {},
  onChange: () => {},
  options: {}
};
MapComponent.propTypes = {
  children: oneOfType([arrayOf(node), node]),
  style: object,
  defaultCenter: object.isRequired,
  defaultZoom: number.isRequired,
  onGoogleApiLoaded: func,
  onChange: func,
  options: object
};

const GoogleMap = /*#__PURE__*/forwardRef(function GoogleMap({
  apiKey,
  libraries,
  children,
  loadingContent,
  idleContent,
  errorContent,
  mapMinHeight,
  containerProps,
  loadScriptExternally,
  status,
  scriptCallback,
  ...props
}, ref) {
  const renderers = {
    ready: /*#__PURE__*/React.createElement(MapComponent, props, children),
    loading: loadingContent,
    idle: idleContent,
    error: errorContent
  };
  const _status = useGoogleMaps({
    apiKey,
    libraries,
    loadScriptExternally,
    status,
    callback: scriptCallback
  });
  return /*#__PURE__*/React.createElement("div", Object.assign({
    style: {
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
      minHeight: mapMinHeight
    },
    ref: ref
  }, containerProps), renderers[_status] || null);
});
GoogleMap.defaultProps = {
  ...MapComponent.defaultProps,
  loadingContent: 'Google Maps is loading',
  idleContent: 'Google Maps is on idle',
  errorContent: 'Google Maps is on error',
  mapMinHeight: 'unset',
  apiKey: '',
  libraries: ['places', 'geometry'],
  loadScriptExternally: false,
  status: 'idle',
  scriptCallback: () => {}
};
GoogleMap.propTypes = {
  ...MapComponent.propTypes,
  children: oneOfType([node, arrayOf(node)]),
  loadingContent: node,
  idleContent: node,
  errorContent: node,
  mapMinHeight: oneOfType([number, string]),
  containerProps: object,
  loadScriptExternally: bool,
  status: oneOf(['idle', 'loading', 'ready', 'error']),
  scriptCallback: func
};

export default GoogleMap;
//# sourceMappingURL=index.modern.js.map
