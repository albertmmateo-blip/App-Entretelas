import React, { useCallback, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import PhotoModal from '../../components/PhotoModal';

function matchesQuery(value, query) {
  return String(value || '')
    .toLowerCase()
    .includes(query);
}

function idsMatch(left, right) {
  return String(left) === String(right);
}

function normalizeTree(data) {
  return data.map((family) => ({
    ...family,
    direct_articles: (family.direct_articles || []).map((article) => ({
      ...article,
      variants: article.variants || [],
    })),
    products: (family.products || []).map((product) => ({
      ...product,
      articles: (product.articles || []).map((article) => ({
        ...article,
        variants: article.variants || [],
      })),
    })),
  }));
}

function familyMatchesSearch(family, query) {
  if (!query) return true;
  return (
    matchesQuery(family.name, query) ||
    family.direct_articles.some(
      (article) => matchesQuery(article.name, query) || matchesQuery(article.color, query)
    ) ||
    family.products.some(
      (product) =>
        matchesQuery(product.name, query) ||
        matchesQuery(product.ref, query) ||
        product.articles.some(
          (article) => matchesQuery(article.name, query) || matchesQuery(article.color, query)
        )
    )
  );
}

function QuantityControl({ value, onChange, disabled }) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded border border-neutral-300 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled}
        className="px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        aria-label="Disminuir stock"
      >
        −
      </button>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(Math.max(0, parseInt(event.target.value, 10) || 0))}
        disabled={disabled}
        aria-label="Cantidad"
        className="w-20 border-x border-neutral-300 px-2 py-1.5 text-center text-sm"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        aria-label="Aumentar stock"
      >
        +
      </button>
    </div>
  );
}

function ColorDot({ hex }) {
  if (!hex) return null;
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-full border border-neutral-300"
      style={{ backgroundColor: hex }}
      aria-hidden="true"
    />
  );
}

function ColorInput({ value, onChange, disabled }) {
  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(value);
  const handleColorEvent = (e) => onChange(e.target.value);
  return (
    <div className="inline-flex items-center overflow-hidden rounded border border-neutral-300 bg-white">
      {isValidHex ? (
        <input
          type="color"
          value={value}
          onChange={handleColorEvent}
          onInput={handleColorEvent}
          disabled={disabled}
          className="h-8 w-8 cursor-pointer border-0 bg-transparent p-0.5 disabled:cursor-not-allowed"
          aria-label="Seleccionar color"
        />
      ) : (
        <input
          type="color"
          defaultValue="#000000"
          onChange={handleColorEvent}
          onInput={handleColorEvent}
          disabled={disabled}
          className="h-8 w-8 cursor-pointer border-0 bg-transparent p-0.5 disabled:cursor-not-allowed opacity-30"
          aria-label="Seleccionar color"
        />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="#rrggbb"
        maxLength={7}
        className="w-24 border-0 border-l border-neutral-300 px-2 py-1.5 text-sm text-neutral-700 focus:outline-none disabled:opacity-50"
        aria-label="Valor hexadecimal del color"
      />
    </div>
  );
}

function FotoIcon({ hasFoto, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`text-xs leading-none px-0.5 hover:scale-110 transition-transform ${hasFoto ? 'opacity-80' : 'opacity-30 hover:opacity-60'}`}
      aria-label={hasFoto ? 'Ver foto' : 'Subir foto'}
      title={hasFoto ? 'Ver foto' : 'Subir foto'}
    >
      🖼️
    </button>
  );
}

function Stock() {
  const [families, setFamilies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFamilyIds, setExpandedFamilyIds] = useState(new Set());
  const [expandedProductIds, setExpandedProductIds] = useState(new Set());

  // Create form
  const [createType, setCreateType] = useState('family');
  const [createArticleParent, setCreateArticleParent] = useState('product');
  const [createName, setCreateName] = useState('');
  const [createRef, setCreateRef] = useState('');
  const [createColor, setCreateColor] = useState('');
  const [createColorHex, setCreateColorHex] = useState('');
  const [createQuantity, setCreateQuantity] = useState(0);
  const [createFamilyId, setCreateFamilyId] = useState('');
  const [createProductId, setCreateProductId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit state
  const [editState, setEditState] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Context menu + delete confirm
  const [menuState, setMenuState] = useState(null);
  const menuAnchorRef = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Photo state
  const [photoModal, setPhotoModal] = useState(null);
  const fotoInputRef = useRef(null);
  const fotoTargetRef = useRef(null);

  const stockAPI = window.electronAPI?.stock;

  React.useEffect(() => {
    let cancelled = false;
    async function loadTree() {
      if (!stockAPI?.getTree) {
        setLoading(false);
        return;
      }
      try {
        const response = await stockAPI.getTree();
        if (!cancelled && response?.success && Array.isArray(response.data)) {
          setFamilies(normalizeTree(response.data));
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTree();
    return () => {
      cancelled = true;
    };
  }, [stockAPI]);

  // Set default create selections after first load
  React.useEffect(() => {
    if (families.length > 0 && !createFamilyId) {
      setCreateFamilyId(families[0].id);
      setCreateProductId(families[0].products?.[0]?.id ?? '');
    }
  }, [families, createFamilyId]);

  // Close context menu on outside click
  React.useEffect(() => {
    const handleClick = () => setMenuState(null);
    if (menuState) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
    return undefined;
  }, [menuState]);

  // Keep context menu anchored to its trigger button while scrolling.
  // isMenuOpen isolates the open/closed transition so the effect does not
  // re-run on every position update (which would create an infinite loop).
  const isMenuOpen = menuState !== null;
  React.useEffect(() => {
    const anchor = menuAnchorRef.current;
    if (!isMenuOpen || !anchor) return undefined;
    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      setMenuState((prev) => (prev ? { ...prev, x: rect.right, y: rect.bottom + 2 } : null));
    };
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    updatePosition();
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMenuOpen]);

  const filteredFamilies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return families.filter((family) => familyMatchesSearch(family, query));
  }, [families, searchQuery]);

  const refreshTree = async () => {
    if (!stockAPI?.getTree) return;
    const response = await stockAPI.getTree();
    if (response?.success && Array.isArray(response.data)) {
      setFamilies(normalizeTree(response.data));
    }
  };

  const expandFamily = (id) => {
    setExpandedFamilyIds((prev) => new Set([...prev, String(id)]));
  };

  const collapseFamily = (id) => {
    setExpandedFamilyIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
  };

  const toggleFamily = (id) => {
    setExpandedFamilyIds((prev) => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
  };

  const expandProduct = (id) => {
    setExpandedProductIds((prev) => new Set([...prev, String(id)]));
  };

  const collapseProduct = (id) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
  };

  const toggleProduct = (id) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
  };

  // ---- Quantity ----
  const changeArticuloQuantity = async (articleId, nextQuantity) => {
    if (!stockAPI?.setArticuloCantidad) return;
    await stockAPI.setArticuloCantidad(articleId, Math.max(0, nextQuantity));
    await refreshTree();
  };

  // ---- Delete ----
  const executeDelete = async (type, id) => {
    try {
      let response;
      if (type === 'family') response = await stockAPI?.deleteFamilia(id);
      else if (type === 'product') response = await stockAPI?.deleteProducto(id);
      else if (type === 'article') response = await stockAPI?.deleteArticulo(id);

      if (!response?.success) {
        setError(response?.error?.message || 'Error al eliminar');
        setDeleteConfirm(null);
        return;
      }
      await refreshTree();
      if (type === 'family') collapseFamily(id);
      if (type === 'product') collapseProduct(id);
      setDeleteConfirm(null);
    } catch (err) {
      setError(`Error al eliminar: ${err.message}`);
      setDeleteConfirm(null);
    }
  };

  // ---- Photo helpers ----
  const handleUploadFoto = (articuloId) => {
    fotoTargetRef.current = articuloId;
    if (fotoInputRef.current) {
      fotoInputRef.current.value = '';
      fotoInputRef.current.click();
    }
  };

  const handleFotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    const articuloId = fotoTargetRef.current;
    if (!file || !articuloId) return;
    const arrayBuf = await file.arrayBuffer();
    const res = await stockAPI.uploadArticuloFoto({
      articulo_id: articuloId,
      filename: file.name,
      buffer: arrayBuf,
    });
    if (res?.success) {
      await refreshTree();
    }
  };

  const handleViewFoto = async (articuloId, articuloName) => {
    const listRes = await stockAPI.getArticuloFotos(articuloId);
    if (!listRes?.success || listRes.data.length === 0) return;
    const foto = listRes.data[0];
    const bytesRes = await stockAPI.getArticuloFotoBytes(foto.ruta_relativa);
    if (!bytesRes?.success) return;
    const ext = foto.nombre_guardado.split('.').pop().toLowerCase();
    const mimeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      bmp: 'image/bmp',
    };
    const blob = new Blob([bytesRes.data], { type: mimeMap[ext] || 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    setPhotoModal({ src: url, alt: articuloName, fotoId: foto.id, articuloId });
  };

  const closePhotoModal = () => {
    if (photoModal?.src) URL.revokeObjectURL(photoModal.src);
    setPhotoModal(null);
  };

  const handleDeleteFoto = async () => {
    if (!photoModal) return;
    const res = await stockAPI.deleteArticuloFoto(photoModal.fotoId);
    if (res?.success) {
      await refreshTree();
      closePhotoModal();
    }
  };

  const handleFotoIconClick = (articuloId, articuloName, hasFoto) => {
    if (hasFoto) {
      handleViewFoto(articuloId, articuloName);
    } else {
      handleUploadFoto(articuloId);
    }
  };

  // ---- Edit ----
  const startEdit = (type, item) => {
    if (type === 'family') {
      setEditState({
        type,
        id: item.id,
        nombre: item.name || '',
        codigo: item.code || '',
        descripcion: item.description || '',
      });
    } else if (type === 'product') {
      setEditState({
        type,
        id: item.id,
        nombre: item.name || '',
        ref: item.ref || '',
        descripcion: item.description || '',
        familia_id: item.family_id,
        orden: item.order ?? 0,
      });
    } else if (type === 'article') {
      setEditState({
        type,
        id: item.id,
        nombre: item.name || '',
        ref: item.ref || '',
        color: item.color || '',
        color_hex: item.color_hex || '',
        cantidad: item.quantity ?? 0,
        producto_id: item.producto_id ?? null,
        familia_id: item.familia_id ?? null,
        parent_articulo_id: item.parent_articulo_id ?? null,
        orden: item.order ?? 0,
      });
    }
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditState(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editState) return;
    setIsSaving(true);
    setEditError(null);
    try {
      let response;
      if (editState.type === 'family') {
        response = await stockAPI?.updateFamilia(editState.id, {
          nombre: editState.nombre,
          codigo: editState.codigo || null,
          descripcion: editState.descripcion || null,
        });
      } else if (editState.type === 'product') {
        response = await stockAPI?.updateProducto(editState.id, {
          nombre: editState.nombre,
          ref: editState.ref || null,
          descripcion: editState.descripcion || null,
          familia_id: editState.familia_id,
          orden: editState.orden,
        });
      } else if (editState.type === 'article') {
        response = await stockAPI?.updateArticulo(editState.id, {
          nombre: editState.nombre,
          ref: editState.ref || null,
          color: editState.color || null,
          color_hex: editState.color_hex || null,
          cantidad: Math.max(0, editState.cantidad),
          producto_id: editState.producto_id,
          familia_id: editState.familia_id,
          parent_articulo_id: editState.parent_articulo_id,
          orden: editState.orden,
        });
      }

      if (!response?.success) {
        setEditError(response?.error?.message || 'Error al guardar');
        return;
      }
      await refreshTree();
      setEditState(null);
    } catch (err) {
      setEditError(err.message || 'Error inesperado');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCantidadChange = useCallback(
    (e) =>
      setEditState((s) => ({ ...s, cantidad: Math.max(0, parseInt(e.target.value, 10) || 0) })),
    []
  );

  // ---- Create ----
  function parseId(value, errorMessage) {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) throw new Error(errorMessage);
    return id;
  }

  const createEntry = async (event) => {
    event.preventDefault();
    setCreateError(null);
    const name = createName.trim();
    if (!name) {
      const msgs = {
        family: 'El nombre de la familia es requerido',
        product: 'El nombre del producto es requerido',
        article: 'El nombre del artículo es requerido',
      };
      setCreateError(msgs[createType] || 'El nombre es requerido');
      return;
    }
    setIsCreating(true);
    try {
      if (createType === 'family') {
        const response = await stockAPI?.createFamilia({ nombre: name });
        if (!response?.success) {
          setCreateError(response?.error?.message || 'Error al crear familia');
          return;
        }
        await refreshTree();
        expandFamily(response.data.id);
        setCreateFamilyId(response.data.id);
      } else if (createType === 'product') {
        if (!createFamilyId) {
          setCreateError('Debes seleccionar una familia primero');
          return;
        }
        const familyIdInt = parseId(createFamilyId, 'ID de familia no válido');
        const response = await stockAPI?.createProducto({
          familia_id: familyIdInt,
          nombre: name,
          ref: createRef.trim() || null,
        });
        if (!response?.success) {
          setCreateError(response?.error?.message || 'Error al crear producto');
          return;
        }
        await refreshTree();
        expandFamily(createFamilyId);
        expandProduct(response.data.id);
        setCreateProductId(response.data.id);
      } else if (createType === 'article') {
        if (!createFamilyId) {
          setCreateError('Debes seleccionar una familia primero');
          return;
        }
        const familyIdInt = parseId(createFamilyId, 'ID de familia no válido');

        if (createArticleParent === 'family') {
          const response = await stockAPI?.createArticulo({
            familia_id: familyIdInt,
            nombre: name,
            color: createColor.trim() || null,
            color_hex: createColorHex.trim() || null,
            cantidad: Math.max(0, parseInt(createQuantity, 10) || 0),
          });
          if (!response?.success) {
            setCreateError(response?.error?.message || 'Error al crear artículo');
            return;
          }
          await refreshTree();
          expandFamily(createFamilyId);
        } else {
          if (!createProductId) {
            setCreateError('Debes seleccionar un producto primero');
            return;
          }
          const productIdInt = parseId(createProductId, 'ID de producto no válido');
          const response = await stockAPI?.createArticulo({
            producto_id: productIdInt,
            nombre: name,
            color: createColor.trim() || null,
            color_hex: createColorHex.trim() || null,
            cantidad: Math.max(0, parseInt(createQuantity, 10) || 0),
          });
          if (!response?.success) {
            setCreateError(response?.error?.message || 'Error al crear artículo');
            return;
          }
          await refreshTree();
          expandFamily(createFamilyId);
          expandProduct(createProductId);
        }
      }
      setCreateName('');
      setCreateRef('');
      setCreateColor('');
      setCreateColorHex('');
      setCreateQuantity(0);
    } catch (err) {
      setCreateError(err.message || 'Error inesperado');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFamilyChange = (event) => {
    setCreateFamilyId(event.target.value);
    const fam = families.find((family) => idsMatch(family.id, event.target.value));
    setCreateProductId(fam?.products[0]?.id ?? '');
  };

  // ---- Shared class names ----
  const btnDots = 'text-neutral-500 hover:text-neutral-700 px-2 py-1';
  const btnSave = 'px-3 py-1 text-sm bg-primary text-white rounded disabled:opacity-50';
  const btnCancel =
    'px-3 py-1 text-sm bg-white border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50';
  const inputSm = 'w-full px-2 py-1 text-sm border border-neutral-300 rounded';

  return (
    <div className="xp-content-panel space-y-4">
      <div className="xp-toolbar justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 m-0">📚 Stock</h1>
      </div>

      {loading && <div className="xp-caption px-1">Cargando stock...</div>}
      {error && !loading && (
        <div className="rounded border border-danger-200 bg-danger-100 px-3 py-2 text-sm text-danger-700">
          No se pudo cargar el stock: {error}
        </div>
      )}

      <div className="xp-toolbar">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar familia, producto o artículo..."
          className="w-full px-4 py-2"
        />
      </div>

      <div className="space-y-4">
        {/* Stock tree */}
        <div className="xp-surface overflow-hidden">
          <div className="xp-card-header">
            <span>Árbol de stock</span>
            <span className="xp-caption">Familia · Producto · Artículo</span>
          </div>
          <div className="p-3 space-y-0.5">
            {filteredFamilies.length === 0 ? (
              <div className="rounded border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
                No hay familias que coincidan con la búsqueda.
              </div>
            ) : (
              filteredFamilies.map((family) => {
                const isFamilyOpen = expandedFamilyIds.has(String(family.id));
                const isEditingFamily =
                  editState?.type === 'family' && idsMatch(editState.id, family.id);

                return (
                  <div key={family.id}>
                    {isEditingFamily ? (
                      <div className="rounded border border-primary bg-primary-50 p-3 space-y-2">
                        <input
                          type="text"
                          value={editState.nombre}
                          onChange={(e) => setEditState((s) => ({ ...s, nombre: e.target.value }))}
                          className={inputSm}
                          placeholder="Nombre de la familia"
                          ref={(input) => input?.focus()}
                        />
                        <input
                          type="text"
                          value={editState.codigo}
                          onChange={(e) => setEditState((s) => ({ ...s, codigo: e.target.value }))}
                          className={inputSm}
                          placeholder="Código (opcional)"
                        />
                        {editError && <div className="text-xs text-danger-700">{editError}</div>}
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={isSaving}
                            className={btnCancel}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={isSaving}
                            className={btnSave}
                          >
                            {isSaving ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 rounded px-2 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors">
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-2 text-left min-w-0"
                          onClick={() => toggleFamily(family.id)}
                          aria-expanded={isFamilyOpen}
                        >
                          <span className="text-xs text-neutral-400 w-3 shrink-0">
                            {isFamilyOpen ? '▼' : '▶'}
                          </span>
                          <span className="text-lg leading-none shrink-0">
                            {isFamilyOpen ? '📂' : '📁'}
                          </span>
                          <span className="font-bold text-neutral-900 truncate">{family.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-neutral-500 pl-2">
                            {family.direct_articles.length > 0
                              ? `${family.direct_articles.length} artículos · `
                              : ''}
                            {family.products.length} productos · {family.stock_total ?? 0} uds
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            menuAnchorRef.current = e.currentTarget;
                            setMenuState({
                              type: 'family',
                              item: family,
                              x: rect.right,
                              y: rect.bottom + 2,
                            });
                          }}
                          className={btnDots}
                          aria-label="Abrir menú de acciones"
                        >
                          ⋮
                        </button>
                      </div>
                    )}
                    {isFamilyOpen && (
                      <div className="ml-5 mt-0.5 mb-1 space-y-0.5 border-l-2 border-amber-200 pl-3">
                        {family.direct_articles.length > 0 && (
                          <div className="mb-1 space-y-1 border-b border-amber-100 pb-1">
                            {family.direct_articles.map((article) => {
                              const isEditingDirectArticle =
                                editState?.type === 'article' && idsMatch(editState.id, article.id);

                              if (isEditingDirectArticle) {
                                return (
                                  <div
                                    key={article.id}
                                    className="rounded border border-primary bg-primary-50 p-3 space-y-2"
                                  >
                                    <div className="grid gap-2 sm:grid-cols-3">
                                      <input
                                        type="text"
                                        value={editState.nombre}
                                        onChange={(e) =>
                                          setEditState((s) => ({ ...s, nombre: e.target.value }))
                                        }
                                        className={inputSm}
                                        placeholder="Nombre"
                                        ref={(input) => input?.focus()}
                                      />
                                      <input
                                        type="text"
                                        value={editState.color}
                                        onChange={(e) =>
                                          setEditState((s) => ({ ...s, color: e.target.value }))
                                        }
                                        className={inputSm}
                                        placeholder="Color (opcional)"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        value={editState.cantidad}
                                        onChange={handleEditCantidadChange}
                                        className={inputSm}
                                        placeholder="Cantidad"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-neutral-500 shrink-0">
                                        Color HEX:
                                      </span>
                                      <ColorInput
                                        value={editState.color_hex || ''}
                                        onChange={(v) =>
                                          setEditState((s) => ({ ...s, color_hex: v }))
                                        }
                                        disabled={isSaving}
                                      />
                                    </div>
                                    {editError && (
                                      <div className="text-xs text-danger-700">{editError}</div>
                                    )}
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        disabled={isSaving}
                                        className={btnCancel}
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={saveEdit}
                                        disabled={isSaving}
                                        className={btnSave}
                                      >
                                        {isSaving ? 'Guardando...' : 'Guardar'}
                                      </button>
                                    </div>
                                    {article.variants.length > 0 && (
                                      <div className="ml-4 space-y-1 border-l-2 border-neutral-300 pl-3">
                                        {article.variants.map((variant) => (
                                          <div
                                            key={variant.id}
                                            className="flex items-center justify-between gap-2 rounded border border-neutral-200 bg-white px-3 py-2"
                                          >
                                            <div>
                                              <div className="text-sm font-medium text-neutral-800">
                                                {variant.name}
                                              </div>
                                              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                <ColorDot hex={variant.color_hex} />
                                                {variant.color || 'Sin color'}
                                              </div>
                                            </div>
                                            <QuantityControl
                                              value={variant.quantity}
                                              onChange={(nextQty) =>
                                                changeArticuloQuantity(variant.id, nextQty)
                                              }
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={article.id}
                                  className="flex flex-col gap-2 rounded border border-amber-200 bg-amber-50 p-2.5 lg:flex-row lg:items-center lg:justify-between"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm shrink-0">📄</span>
                                    <FotoIcon
                                      hasFoto={article.has_foto}
                                      onClick={() =>
                                        handleFotoIconClick(
                                          article.id,
                                          article.name,
                                          article.has_foto
                                        )
                                      }
                                    />
                                    <div className="min-w-0">
                                      <div className="font-medium text-neutral-900 truncate">
                                        {article.name}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                        <ColorDot hex={article.color_hex} />
                                        {article.color || 'Sin color'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <QuantityControl
                                      value={article.quantity}
                                      onChange={(nextQty) =>
                                        changeArticuloQuantity(article.id, nextQty)
                                      }
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        menuAnchorRef.current = e.currentTarget;
                                        setMenuState({
                                          type: 'article',
                                          item: article,
                                          x: rect.right,
                                          y: rect.bottom + 2,
                                        });
                                      }}
                                      className={btnDots}
                                      aria-label="Abrir menú de acciones"
                                    >
                                      ⋮
                                    </button>
                                  </div>
                                  {article.variants.length > 0 && (
                                    <div className="col-span-full mt-1 ml-6 space-y-1 border-l-2 border-amber-300 pl-3">
                                      {article.variants.map((variant) => (
                                        <div
                                          key={variant.id}
                                          className="flex items-center justify-between gap-2 rounded border border-amber-200 bg-white px-3 py-2"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <FotoIcon
                                              hasFoto={variant.has_foto}
                                              onClick={() =>
                                                handleFotoIconClick(
                                                  variant.id,
                                                  variant.name,
                                                  variant.has_foto
                                                )
                                              }
                                            />
                                            <div>
                                              <div className="text-sm font-medium text-neutral-800">
                                                {variant.name}
                                              </div>
                                              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                <ColorDot hex={variant.color_hex} />
                                                {variant.color || 'Sin color'}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <QuantityControl
                                              value={variant.quantity}
                                              onChange={(nextQty) =>
                                                changeArticuloQuantity(variant.id, nextQty)
                                              }
                                            />
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const rect =
                                                  e.currentTarget.getBoundingClientRect();
                                                menuAnchorRef.current = e.currentTarget;
                                                setMenuState({
                                                  type: 'article',
                                                  item: variant,
                                                  x: rect.right,
                                                  y: rect.bottom + 2,
                                                });
                                              }}
                                              className={btnDots}
                                              aria-label="Abrir menú de acciones"
                                            >
                                              ⋮
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {family.products.length === 0 && family.direct_articles.length === 0 ? (
                          <div className="py-2 px-3 text-sm italic text-neutral-400">
                            Sin productos
                          </div>
                        ) : (
                          family.products.map((product) => {
                            const isProductOpen = expandedProductIds.has(String(product.id));
                            const isEditingProduct =
                              editState?.type === 'product' && idsMatch(editState.id, product.id);

                            return (
                              <div key={product.id}>
                                {isEditingProduct ? (
                                  <div className="rounded border border-primary bg-primary-50 p-3 space-y-2">
                                    <input
                                      type="text"
                                      value={editState.nombre}
                                      onChange={(e) =>
                                        setEditState((s) => ({ ...s, nombre: e.target.value }))
                                      }
                                      className={inputSm}
                                      placeholder="Nombre del producto"
                                      ref={(input) => input?.focus()}
                                    />
                                    <input
                                      type="text"
                                      value={editState.ref}
                                      onChange={(e) =>
                                        setEditState((s) => ({ ...s, ref: e.target.value }))
                                      }
                                      className={inputSm}
                                      placeholder="Referencia (opcional)"
                                    />
                                    {editError && (
                                      <div className="text-xs text-danger-700">{editError}</div>
                                    )}
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        disabled={isSaving}
                                        className={btnCancel}
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={saveEdit}
                                        disabled={isSaving}
                                        className={btnSave}
                                      >
                                        {isSaving ? 'Guardando...' : 'Guardar'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 rounded px-2 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                                    <button
                                      type="button"
                                      className="flex flex-1 items-center gap-2 text-left min-w-0"
                                      onClick={() => toggleProduct(product.id)}
                                      aria-expanded={isProductOpen}
                                    >
                                      <span className="text-xs text-neutral-400 w-3 shrink-0">
                                        {isProductOpen ? '▼' : '▶'}
                                      </span>
                                      <span className="text-base leading-none shrink-0">
                                        {isProductOpen ? '📂' : '📁'}
                                      </span>
                                      <span className="font-semibold text-neutral-800 truncate">
                                        {product.name}
                                      </span>
                                      {product.ref && (
                                        <span className="text-xs text-neutral-500 shrink-0">
                                          {product.ref}
                                        </span>
                                      )}
                                      <span className="ml-auto shrink-0 text-xs text-neutral-500 pl-2">
                                        {(product.articles || []).length} artículos ·{' '}
                                        {product.stock_total ?? 0} uds
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        menuAnchorRef.current = e.currentTarget;
                                        setMenuState({
                                          type: 'product',
                                          item: product,
                                          x: rect.right,
                                          y: rect.bottom + 2,
                                        });
                                      }}
                                      className={btnDots}
                                      aria-label="Abrir menú de acciones"
                                    >
                                      ⋮
                                    </button>
                                  </div>
                                )}
                                {isProductOpen && (
                                  <div className="ml-5 mt-0.5 mb-0.5 space-y-1 border-l-2 border-blue-200 pl-3 py-1">
                                    {product.articles.length === 0 ? (
                                      <div className="py-1 px-3 text-sm italic text-neutral-400">
                                        Sin artículos
                                      </div>
                                    ) : (
                                      product.articles.map((article) => {
                                        const isEditingArticle =
                                          editState?.type === 'article' &&
                                          idsMatch(editState.id, article.id);

                                        if (isEditingArticle) {
                                          return (
                                            <div
                                              key={article.id}
                                              className="rounded border border-primary bg-primary-50 p-3 space-y-2"
                                            >
                                              <div className="grid gap-2 sm:grid-cols-3">
                                                <input
                                                  type="text"
                                                  value={editState.nombre}
                                                  onChange={(e) =>
                                                    setEditState((s) => ({
                                                      ...s,
                                                      nombre: e.target.value,
                                                    }))
                                                  }
                                                  className={inputSm}
                                                  placeholder="Nombre"
                                                  ref={(input) => input?.focus()}
                                                />
                                                <input
                                                  type="text"
                                                  value={editState.color}
                                                  onChange={(e) =>
                                                    setEditState((s) => ({
                                                      ...s,
                                                      color: e.target.value,
                                                    }))
                                                  }
                                                  className={inputSm}
                                                  placeholder="Color (opcional)"
                                                />
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={editState.cantidad}
                                                  onChange={handleEditCantidadChange}
                                                  className={inputSm}
                                                  placeholder="Cantidad"
                                                />
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-neutral-500 shrink-0">
                                                  Color HEX:
                                                </span>
                                                <ColorInput
                                                  value={editState.color_hex || ''}
                                                  onChange={(v) =>
                                                    setEditState((s) => ({ ...s, color_hex: v }))
                                                  }
                                                  disabled={isSaving}
                                                />
                                              </div>
                                              {editError && (
                                                <div className="text-xs text-danger-700">
                                                  {editError}
                                                </div>
                                              )}
                                              <div className="flex gap-2 justify-end">
                                                <button
                                                  type="button"
                                                  onClick={cancelEdit}
                                                  disabled={isSaving}
                                                  className={btnCancel}
                                                >
                                                  Cancelar
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={saveEdit}
                                                  disabled={isSaving}
                                                  className={btnSave}
                                                >
                                                  {isSaving ? 'Guardando...' : 'Guardar'}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div
                                            key={article.id}
                                            className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-2.5 lg:flex-row lg:items-center lg:justify-between"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="text-sm shrink-0">📄</span>
                                              <FotoIcon
                                                hasFoto={article.has_foto}
                                                onClick={() =>
                                                  handleFotoIconClick(
                                                    article.id,
                                                    article.name,
                                                    article.has_foto
                                                  )
                                                }
                                              />
                                              <div className="min-w-0">
                                                <div className="font-medium text-neutral-900 truncate">
                                                  {article.name}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                  <ColorDot hex={article.color_hex} />
                                                  {article.color || 'Sin color'}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <QuantityControl
                                                value={article.quantity}
                                                onChange={(nextQty) =>
                                                  changeArticuloQuantity(article.id, nextQty)
                                                }
                                              />
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const rect =
                                                    e.currentTarget.getBoundingClientRect();
                                                  menuAnchorRef.current = e.currentTarget;
                                                  setMenuState({
                                                    type: 'article',
                                                    item: article,
                                                    x: rect.right,
                                                    y: rect.bottom + 2,
                                                  });
                                                }}
                                                className={btnDots}
                                                aria-label="Abrir menú de acciones"
                                              >
                                                ⋮
                                              </button>
                                            </div>
                                            {article.variants.length > 0 && (
                                              <div className="col-span-full mt-1 ml-6 space-y-1 border-l-2 border-neutral-300 pl-3">
                                                {article.variants.map((variant) => {
                                                  const isEditingVariant =
                                                    editState?.type === 'article' &&
                                                    idsMatch(editState.id, variant.id);

                                                  if (isEditingVariant) {
                                                    return (
                                                      <div
                                                        key={variant.id}
                                                        className="rounded border border-primary bg-primary-50 p-2 space-y-2"
                                                      >
                                                        <div className="grid gap-2 sm:grid-cols-3">
                                                          <input
                                                            type="text"
                                                            value={editState.nombre}
                                                            onChange={(e) =>
                                                              setEditState((s) => ({
                                                                ...s,
                                                                nombre: e.target.value,
                                                              }))
                                                            }
                                                            className={inputSm}
                                                            placeholder="Nombre"
                                                            ref={(input) => input?.focus()}
                                                          />
                                                          <input
                                                            type="text"
                                                            value={editState.color}
                                                            onChange={(e) =>
                                                              setEditState((s) => ({
                                                                ...s,
                                                                color: e.target.value,
                                                              }))
                                                            }
                                                            className={inputSm}
                                                            placeholder="Color (opcional)"
                                                          />
                                                          <input
                                                            type="number"
                                                            min="0"
                                                            value={editState.cantidad}
                                                            onChange={handleEditCantidadChange}
                                                            className={inputSm}
                                                            placeholder="Cantidad"
                                                          />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-xs text-neutral-500 shrink-0">
                                                            Color HEX:
                                                          </span>
                                                          <ColorInput
                                                            value={editState.color_hex || ''}
                                                            onChange={(v) =>
                                                              setEditState((s) => ({
                                                                ...s,
                                                                color_hex: v,
                                                              }))
                                                            }
                                                            disabled={isSaving}
                                                          />
                                                        </div>
                                                        {editError && (
                                                          <div className="text-xs text-danger-700">
                                                            {editError}
                                                          </div>
                                                        )}
                                                        <div className="flex gap-2 justify-end">
                                                          <button
                                                            type="button"
                                                            onClick={cancelEdit}
                                                            disabled={isSaving}
                                                            className={btnCancel}
                                                          >
                                                            Cancelar
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={saveEdit}
                                                            disabled={isSaving}
                                                            className={btnSave}
                                                          >
                                                            {isSaving ? 'Guardando...' : 'Guardar'}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    );
                                                  }

                                                  return (
                                                    <div
                                                      key={variant.id}
                                                      className="flex items-center justify-between gap-2 rounded border border-neutral-200 bg-white px-3 py-2"
                                                    >
                                                      <div className="flex items-center gap-1.5">
                                                        <FotoIcon
                                                          hasFoto={variant.has_foto}
                                                          onClick={() =>
                                                            handleFotoIconClick(
                                                              variant.id,
                                                              variant.name,
                                                              variant.has_foto
                                                            )
                                                          }
                                                        />
                                                        <div>
                                                          <div className="text-sm font-medium text-neutral-800">
                                                            {variant.name}
                                                          </div>
                                                          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                            <ColorDot hex={variant.color_hex} />
                                                            {variant.color || 'Sin color'}
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <QuantityControl
                                                          value={variant.quantity}
                                                          onChange={(nextQty) =>
                                                            changeArticuloQuantity(
                                                              variant.id,
                                                              nextQty
                                                            )
                                                          }
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            const rect =
                                                              e.currentTarget.getBoundingClientRect();
                                                            menuAnchorRef.current = e.currentTarget;
                                                            setMenuState({
                                                              type: 'article',
                                                              item: variant,
                                                              x: rect.right,
                                                              y: rect.bottom + 2,
                                                            });
                                                          }}
                                                          className={btnDots}
                                                          aria-label="Abrir menú de acciones"
                                                        >
                                                          ⋮
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Create form */}
        <form onSubmit={createEntry} className="xp-surface overflow-hidden">
          <div className="xp-card-header">
            <span>Crear nuevo elemento</span>
            <span className="xp-caption">Familia, producto o artículo</span>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {createError && (
              <div className="col-span-full rounded border border-danger-200 bg-danger-100 px-3 py-2 text-sm text-danger-700">
                {createError}
              </div>
            )}

            <label htmlFor="stock-create-type" className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-neutral-500">Tipo</span>
              <select
                id="stock-create-type"
                value={createType}
                onChange={(event) => setCreateType(event.target.value)}
                disabled={isCreating}
                className="w-full px-3 py-2"
              >
                <option value="family">Familia</option>
                <option value="product">Producto</option>
                <option value="article">Artículo</option>
              </select>
            </label>

            {createType === 'article' && (
              <label htmlFor="stock-create-article-parent" className="space-y-1">
                <span className="block text-xs font-semibold uppercase text-neutral-500">
                  Ubicación
                </span>
                <select
                  id="stock-create-article-parent"
                  value={createArticleParent}
                  onChange={(e) => setCreateArticleParent(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2"
                >
                  <option value="product">Bajo un producto</option>
                  <option value="family">Directamente bajo familia</option>
                </select>
              </label>
            )}

            <label htmlFor="stock-create-name" className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-neutral-500">Nombre</span>
              <input
                id="stock-create-name"
                type="text"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                disabled={isCreating}
                className="w-full px-3 py-2"
                placeholder="Nombre visible"
              />
            </label>

            <label htmlFor="stock-create-ref" className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-neutral-500">
                Referencia
              </span>
              <input
                id="stock-create-ref"
                type="text"
                value={createRef}
                onChange={(event) => setCreateRef(event.target.value)}
                disabled={isCreating || createType !== 'product'}
                className="w-full px-3 py-2"
                placeholder="Referencia del producto"
              />
            </label>

            <label htmlFor="stock-create-color" className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-neutral-500">Color</span>
              <input
                id="stock-create-color"
                type="text"
                value={createColor}
                onChange={(event) => setCreateColor(event.target.value)}
                disabled={isCreating || createType !== 'article'}
                className="w-full px-3 py-2"
                placeholder="Color del artículo"
              />
            </label>

            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-neutral-500">
                Color HEX
              </span>
              <ColorInput
                value={createColorHex}
                onChange={(v) => setCreateColorHex(v)}
                disabled={isCreating || createType !== 'article'}
              />
            </div>

            <label htmlFor="stock-create-quantity" className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-neutral-500">
                Cantidad
              </span>
              <input
                id="stock-create-quantity"
                type="number"
                min="0"
                value={createQuantity}
                onChange={(event) =>
                  setCreateQuantity(Math.max(0, parseInt(event.target.value, 10) || 0))
                }
                disabled={isCreating || createType !== 'article'}
                className="w-full px-3 py-2"
              />
            </label>

            <label htmlFor="stock-create-family" className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-neutral-500">
                Familia
              </span>
              <select
                id="stock-create-family"
                value={createFamilyId}
                onChange={handleCreateFamilyChange}
                disabled={isCreating || createType === 'family'}
                className="w-full px-3 py-2"
              >
                <option value="">Selecciona una familia</option>
                {families.map((fam) => (
                  <option key={fam.id} value={fam.id}>
                    {fam.name}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="stock-create-product" className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-neutral-500">
                Producto
              </span>
              <select
                id="stock-create-product"
                value={createProductId}
                onChange={(event) => setCreateProductId(event.target.value)}
                disabled={
                  isCreating ||
                  createType === 'family' ||
                  createType === 'product' ||
                  (createType === 'article' && createArticleParent === 'family')
                }
                className="w-full px-3 py-2"
              >
                <option value="">Selecciona un producto</option>
                {families
                  .find((fam) => idsMatch(fam.id, createFamilyId))
                  ?.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>

            <div className="col-span-full flex items-end justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 font-semibold bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Context menu */}
      {menuState && (
        <div
          role="menu"
          tabIndex={-1}
          className="xp-context-menu fixed py-1 z-50"
          style={{ top: menuState.y, left: menuState.x, transform: 'translateX(-100%)' }}
          ref={(node) => {
            if (!node) return;
            const viewportPadding = 4;
            const rect = node.getBoundingClientRect();
            const overflowLeft = viewportPadding - rect.left;
            if (overflowLeft > 0) {
              // eslint-disable-next-line no-param-reassign
              node.style.left = `${parseFloat(node.style.left) + overflowLeft}px`;
            }
            const adjustedRect = node.getBoundingClientRect();
            const overflowRight = adjustedRect.right - window.innerWidth + viewportPadding;
            if (overflowRight > 0) {
              // eslint-disable-next-line no-param-reassign
              node.style.left = `${parseFloat(node.style.left) - overflowRight}px`;
            }
            const finalRect = node.getBoundingClientRect();
            const overflowBottom = finalRect.bottom - window.innerHeight + viewportPadding;
            if (overflowBottom > 0) {
              // eslint-disable-next-line no-param-reassign
              node.style.top = `${parseFloat(node.style.top) - overflowBottom}px`;
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              startEdit(menuState.type, menuState.item);
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
          >
            Editar
          </button>
          {menuState.type === 'article' && (
            <button
              type="button"
              onClick={() => {
                if (menuState.item.has_foto) {
                  handleViewFoto(menuState.item.id, menuState.item.name);
                } else {
                  handleUploadFoto(menuState.item.id);
                }
                setMenuState(null);
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
            >
              {menuState.item.has_foto ? '🖼️ Ver foto' : '📷 Subir foto'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm({ type: menuState.type, item: menuState.item });
              setMenuState(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/5"
          >
            Eliminar
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="¿Eliminar este elemento?"
          message="Esta acción no se puede deshacer."
          onConfirm={() => executeDelete(deleteConfirm.type, deleteConfirm.item.id)}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Eliminar"
          confirmDanger
        />
      )}

      {/* Hidden file input for photo upload */}
      <input
        ref={fotoInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.bmp"
        className="hidden"
        onChange={handleFotoFileChange}
      />

      {/* Photo lightbox */}
      {photoModal && (
        <PhotoModal
          src={photoModal.src}
          alt={photoModal.alt}
          onClose={closePhotoModal}
          onDelete={handleDeleteFoto}
        />
      )}
    </div>
  );
}

export default Stock;
