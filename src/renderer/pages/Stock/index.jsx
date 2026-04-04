import React, { useMemo, useState } from 'react';

const createId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const initialFamilies = [
  {
    id: 'family-bies',
    name: 'Bies',
    code: 'F-01',
    products: [
      {
        id: 'product-bies-cotton',
        name: 'Bies de algodon',
        ref: 'BIE-ALG',
        notes: 'Base para prendas y remates.',
        articles: [
          {
            id: 'article-bies-rojo',
            name: 'Bies rojo 20 mm',
            ref: 'BIE-ROJ-20',
            quantity: 12,
            notes: 'Stock general sin variantes.',
            variants: [],
          },
          {
            id: 'article-bies-bicolor',
            name: 'Bies satinado',
            ref: 'BIE-SAT',
            quantity: 0,
            notes: 'Se gestiona por variantes de color.',
            variants: [
              { id: 'variant-satin-azul', name: 'Azul marino', ref: 'SAT-AZ', quantity: 7 },
              { id: 'variant-satin-verde', name: 'Verde botella', ref: 'SAT-VE', quantity: 4 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'family-cinta',
    name: 'Cinta',
    code: 'F-02',
    products: [
      {
        id: 'product-cinta-raso',
        name: 'Cinta de raso',
        ref: 'CIN-RAS',
        notes: 'Disponible por color y ancho.',
        articles: [
          {
            id: 'article-cinta-negra',
            name: 'Cinta negra 15 mm',
            ref: 'CIN-NEG-15',
            quantity: 21,
            notes: '',
            variants: [],
          },
        ],
      },
    ],
  },
];

const SECTION_TABS = [
  { key: 'familias', label: 'Familias' },
  { key: 'productos', label: 'Productos' },
  { key: 'articulos', label: 'Artículos' },
  { key: 'variantes', label: 'Variantes' },
];

function sumArticleQuantity(article) {
  const variantTotal = (article.variants || []).reduce(
    (total, variant) => total + variant.quantity,
    0
  );
  return article.quantity + variantTotal;
}

function matchesQuery(value, query) {
  return String(value || '')
    .toLowerCase()
    .includes(query);
}

function idsMatch(left, right) {
  return String(left) === String(right);
}

function familyMatchesSearch(family, query) {
  if (!query) return true;

  return (
    matchesQuery(family.name, query) ||
    matchesQuery(family.code, query) ||
    family.products.some(
      (product) =>
        matchesQuery(product.name, query) ||
        matchesQuery(product.ref, query) ||
        matchesQuery(product.notes, query) ||
        product.articles.some(
          (article) =>
            matchesQuery(article.name, query) ||
            matchesQuery(article.ref, query) ||
            matchesQuery(article.notes, query) ||
            article.variants.some(
              (variant) => matchesQuery(variant.name, query) || matchesQuery(variant.ref, query)
            )
        )
    )
  );
}

function QuantityControl({ value, onChange }) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded border border-neutral-300 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-100"
        aria-label="Disminuir stock"
      >
        -
      </button>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="w-20 border-x border-neutral-300 px-2 py-1.5 text-center text-sm"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-100"
        aria-label="Aumentar stock"
      >
        +
      </button>
    </div>
  );
}

function Stock() {
  const [families, setFamilies] = useState(initialFamilies);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('familias');
  const [selectedFamilyId, setSelectedFamilyId] = useState(initialFamilies[0]?.id ?? '');
  const [selectedProductId, setSelectedProductId] = useState(
    initialFamilies[0]?.products[0]?.id ?? ''
  );
  const [selectedArticleId, setSelectedArticleId] = useState(
    initialFamilies[0]?.products[0]?.articles[0]?.id ?? ''
  );
  const [createType, setCreateType] = useState('family');
  const [createName, setCreateName] = useState('');
  const [createRef, setCreateRef] = useState('');
  const [createQuantity, setCreateQuantity] = useState(0);
  const [createFamilyId, setCreateFamilyId] = useState(initialFamilies[0]?.id ?? '');
  const [createProductId, setCreateProductId] = useState(initialFamilies[0]?.products[0]?.id ?? '');
  const [createArticleId, setCreateArticleId] = useState(
    initialFamilies[0]?.products[0]?.articles[0]?.id ?? ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setFamilies(response.data);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTree();

    return () => {
      cancelled = true;
    };
  }, [stockAPI]);

  const filteredFamilies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return families.filter((family) => familyMatchesSearch(family, query));
  }, [families, searchQuery]);

  const activeFamily = useMemo(() => {
    if (!filteredFamilies.length) return null;
    return (
      filteredFamilies.find((family) => idsMatch(family.id, selectedFamilyId)) ??
      filteredFamilies[0] ??
      null
    );
  }, [filteredFamilies, selectedFamilyId]);

  const activeProduct = useMemo(() => {
    if (!activeFamily) return null;
    return (
      activeFamily.products.find((product) => idsMatch(product.id, selectedProductId)) ??
      activeFamily.products[0] ??
      null
    );
  }, [activeFamily, selectedProductId]);

  const activeArticle = useMemo(() => {
    if (!activeProduct) return null;
    return (
      activeProduct.articles.find((article) => idsMatch(article.id, selectedArticleId)) ??
      activeProduct.articles[0] ??
      null
    );
  }, [activeProduct, selectedArticleId]);

  const mutateFamilies = (updater) => {
    setFamilies((current) => updater(current));
  };

  const refreshTree = async () => {
    if (!stockAPI?.getTree) return;
    const response = await stockAPI.getTree();
    if (response?.success && Array.isArray(response.data)) {
      setFamilies(response.data);
    }
  };

  const changeArticleQuantity = async (articleId, nextQuantity) => {
    if (stockAPI?.setArticuloCantidad) {
      await stockAPI.setArticuloCantidad(articleId, Math.max(0, nextQuantity));
      await refreshTree();
      return;
    }

    mutateFamilies((current) =>
      current.map((family) => ({
        ...family,
        products: family.products.map((product) => ({
          ...product,
          articles: product.articles.map((article) =>
            article.id === articleId ? { ...article, quantity: Math.max(0, nextQuantity) } : article
          ),
        })),
      }))
    );
  };

  const changeVariantQuantity = async (variantId, nextQuantity) => {
    if (stockAPI?.setArticuloCantidad) {
      await stockAPI.setArticuloCantidad(variantId, Math.max(0, nextQuantity));
      await refreshTree();
      return;
    }

    mutateFamilies((current) =>
      current.map((family) => ({
        ...family,
        products: family.products.map((product) => ({
          ...product,
          articles: product.articles.map((article) => ({
            ...article,
            variants: article.variants.map((variant) =>
              variant.id === variantId
                ? { ...variant, quantity: Math.max(0, nextQuantity) }
                : variant
            ),
          })),
        })),
      }))
    );
  };

  const createEntry = async (event) => {
    event.preventDefault();

    const name = createName.trim();
    if (!name) return;

    if (createType === 'family') {
      if (stockAPI?.createFamilia) {
        const response = await stockAPI.createFamilia({
          nombre: name,
          codigo: createRef.trim() || null,
          descripcion: null,
        });
        if (response?.success) {
          await refreshTree();
          setSelectedFamilyId(response.data.id);
          setSelectedProductId(null);
          setSelectedArticleId(null);
          setCreateFamilyId(response.data.id);
        }
      } else {
        const family = {
          id: createId('family'),
          name,
          code: createRef.trim() || `F-${families.length + 1}`,
          products: [],
        };
        mutateFamilies((current) => [...current, family]);
        setSelectedFamilyId(family.id);
        setSelectedProductId(null);
        setSelectedArticleId(null);
        setCreateFamilyId(family.id);
      }
    }

    if (createType === 'product' && createFamilyId) {
      if (stockAPI?.createProducto) {
        const response = await stockAPI.createProducto({
          familia_id: createFamilyId,
          nombre: name,
          ref: createRef.trim() || null,
          descripcion: null,
        });
        if (response?.success) {
          await refreshTree();
          setSelectedFamilyId(createFamilyId);
          setSelectedProductId(response.data.id);
          setSelectedArticleId(null);
          setCreateProductId(response.data.id);
        }
      } else {
        const product = {
          id: createId('product'),
          name,
          ref: createRef.trim(),
          notes: '',
          articles: [],
        };
        mutateFamilies((current) =>
          current.map((family) =>
            family.id === createFamilyId
              ? { ...family, products: [...family.products, product] }
              : family
          )
        );
        setSelectedFamilyId(createFamilyId);
        setSelectedProductId(product.id);
        setSelectedArticleId(null);
        setCreateProductId(product.id);
      }
    }

    if (createType === 'article' && createProductId) {
      if (stockAPI?.createArticulo) {
        const response = await stockAPI.createArticulo({
          producto_id: createProductId,
          nombre: name,
          ref: createRef.trim() || null,
          cantidad: Math.max(0, Number(createQuantity || 0)),
          notas: null,
        });
        if (response?.success) {
          await refreshTree();
          setSelectedProductId(createProductId);
          setSelectedArticleId(response.data.id);
          setCreateArticleId(response.data.id);
        }
      } else {
        const article = {
          id: createId('article'),
          name,
          ref: createRef.trim(),
          quantity: Math.max(0, Number(createQuantity || 0)),
          notes: '',
          variants: [],
        };

        mutateFamilies((current) =>
          current.map((family) => ({
            ...family,
            products: family.products.map((product) =>
              product.id === createProductId
                ? { ...product, articles: [...product.articles, article] }
                : product
            ),
          }))
        );
        setSelectedProductId(createProductId);
        setSelectedArticleId(article.id);
        setCreateArticleId(article.id);
      }
    }

    if (createType === 'variant' && createArticleId) {
      if (stockAPI?.createArticulo) {
        const response = await stockAPI.createArticulo({
          producto_id: createProductId,
          parent_articulo_id: createArticleId,
          nombre: name,
          ref: createRef.trim() || null,
          cantidad: Math.max(0, Number(createQuantity || 0)),
          notas: null,
        });
        if (response?.success) {
          await refreshTree();
          setSelectedArticleId(createArticleId);
        }
      } else {
        const variant = {
          id: createId('variant'),
          name,
          ref: createRef.trim(),
          quantity: Math.max(0, Number(createQuantity || 0)),
        };

        mutateFamilies((current) =>
          current.map((family) => ({
            ...family,
            products: family.products.map((product) => ({
              ...product,
              articles: product.articles.map((article) =>
                article.id === createArticleId
                  ? { ...article, variants: [...article.variants, variant] }
                  : article
              ),
            })),
          }))
        );
        setSelectedArticleId(createArticleId);
      }
    }

    setCreateName('');
    setCreateRef('');
    setCreateQuantity(0);
  };

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

      <div className="xp-toolbar xp-toolbar--stacked">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar familia, producto, articulo o variante..."
          className="min-w-[240px] flex-1 px-4 py-2"
        />
        <div className="flex flex-wrap gap-2">
          {SECTION_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`px-4 py-2 text-sm font-semibold ${activeSection === tab.key ? 'bg-primary text-white' : 'bg-white text-neutral-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="xp-surface overflow-hidden">
          <div className="xp-card-header">
            <span>Familias</span>
            <span className="xp-caption">{filteredFamilies.length} visibles</span>
          </div>
          <div className="max-h-[640px] space-y-2 overflow-auto p-3">
            {filteredFamilies.length === 0 ? (
              <div className="rounded border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
                No hay resultados para la busqueda actual.
              </div>
            ) : (
              filteredFamilies.map((family) => {
                const familyQuantity = family.products.reduce(
                  (count, product) =>
                    count +
                    product.articles.reduce(
                      (articleCount, article) => articleCount + sumArticleQuantity(article),
                      0
                    ),
                  0
                );
                const isActive = family.id === activeFamily?.id;
                return (
                  <button
                    key={family.id}
                    type="button"
                    onClick={() => {
                      setSelectedFamilyId(family.id);
                      setSelectedProductId(family.products[0]?.id ?? null);
                      setSelectedArticleId(family.products[0]?.articles[0]?.id ?? null);
                    }}
                    className={`w-full rounded border px-3 py-3 text-left transition-colors ${isActive ? 'border-primary bg-primary-100' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-neutral-900">{family.name}</div>
                        <div className="text-xs text-neutral-500">{family.code}</div>
                      </div>
                      <div className="text-right text-xs text-neutral-500">
                        <div>{family.products.length} productos</div>
                        <div>{familyQuantity} uds</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-neutral-600">
                      {family.products.map((product) => product.name).join(' · ') ||
                        'Sin productos'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="xp-surface overflow-hidden">
            <div className="xp-card-header">
              <span>Resumen de selección</span>
              <span className="xp-caption">{activeSection}</span>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-3">
              <div className="rounded border border-neutral-200 bg-white p-3">
                <div className="text-xs uppercase text-neutral-500">Familia</div>
                <div className="font-semibold text-neutral-900">
                  {activeFamily?.name ?? 'Sin selección'}
                </div>
              </div>
              <div className="rounded border border-neutral-200 bg-white p-3">
                <div className="text-xs uppercase text-neutral-500">Producto</div>
                <div className="font-semibold text-neutral-900">
                  {activeProduct?.name ?? 'Sin selección'}
                </div>
              </div>
              <div className="rounded border border-neutral-200 bg-white p-3">
                <div className="text-xs uppercase text-neutral-500">Articulo</div>
                <div className="font-semibold text-neutral-900">
                  {activeArticle?.name ?? 'Sin selección'}
                </div>
              </div>
            </div>
          </div>

          <div className="xp-surface overflow-hidden">
            <div className="xp-card-header">
              <span>Árbol de stock</span>
              <span className="xp-caption">Edición local inicial</span>
            </div>
            <div className="space-y-4 p-4">
              {!activeFamily ? (
                <div className="rounded border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
                  No hay familias que coincidan con la busqueda.
                </div>
              ) : (
                activeFamily.products.map((product) => {
                  const productIsActive = idsMatch(product.id, activeProduct?.id);
                  return (
                    <div key={product.id} className="rounded border border-neutral-200 bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFamilyId(activeFamily.id);
                          setSelectedProductId(product.id);
                          setSelectedArticleId(product.articles[0]?.id ?? null);
                        }}
                        className={`flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left ${productIsActive ? 'bg-primary-100' : 'bg-neutral-50 hover:bg-neutral-100'}`}
                      >
                        <div>
                          <div className="font-semibold text-neutral-900">{product.name}</div>
                          <div className="text-xs text-neutral-500">
                            {product.ref || 'Sin referencia'}
                          </div>
                        </div>
                        <div className="text-right text-xs text-neutral-500">
                          <div>{product.articles.length} articulos</div>
                          <div>{product.notes || 'Sin notas'}</div>
                        </div>
                      </button>

                      <div className="space-y-3 p-4">
                        {product.articles.map((article) => {
                          const articleIsActive = article.id === activeArticle?.id;
                          return (
                            <div
                              key={article.id}
                              className={`rounded border px-3 py-3 ${articleIsActive ? 'border-primary bg-primary-100/50' : 'border-neutral-200 bg-neutral-50'}`}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFamilyId(activeFamily.id);
                                    setSelectedProductId(product.id);
                                    setSelectedArticleId(article.id);
                                  }}
                                  className="text-left"
                                >
                                  <div className="font-semibold text-neutral-900">
                                    {article.name}
                                  </div>
                                  <div className="text-xs text-neutral-500">
                                    {article.ref || 'Sin referencia'}
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-500">
                                    Total: {sumArticleQuantity(article)} uds
                                  </div>
                                </button>

                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-xs font-semibold uppercase text-neutral-500">
                                    Cantidad base
                                  </span>
                                  <QuantityControl
                                    value={article.quantity}
                                    onChange={(nextQuantity) =>
                                      changeArticleQuantity(article.id, nextQuantity)
                                    }
                                  />
                                </div>
                              </div>

                              {article.notes && (
                                <p className="mt-3 text-xs text-neutral-600">{article.notes}</p>
                              )}

                              {article.variants.length > 0 && (
                                <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3">
                                  <div className="text-xs font-semibold uppercase text-neutral-500">
                                    Variantes
                                  </div>
                                  {article.variants.map((variant) => (
                                    <div
                                      key={variant.id}
                                      className="flex flex-col gap-2 rounded border border-neutral-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between"
                                    >
                                      <div>
                                        <div className="font-medium text-neutral-900">
                                          {variant.name}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                          {variant.ref || 'Sin referencia'}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <QuantityControl
                                          value={variant.quantity}
                                          onChange={(nextQuantity) =>
                                            changeVariantQuantity(variant.id, nextQuantity)
                                          }
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <form onSubmit={createEntry} className="xp-surface overflow-hidden">
            <div className="xp-card-header">
              <span>Crear nuevo elemento</span>
              <span className="xp-caption">Familia, producto, articulo o variante</span>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              <label htmlFor="stock-create-type" className="space-y-1">
                <span className="block text-xs font-semibold uppercase text-neutral-500">Tipo</span>
                <select
                  id="stock-create-type"
                  value={createType}
                  onChange={(event) => setCreateType(event.target.value)}
                  className="w-full px-3 py-2"
                >
                  <option value="family">Familia</option>
                  <option value="product">Producto</option>
                  <option value="article">Artículo</option>
                  <option value="variant">Variante</option>
                </select>
              </label>

              <label htmlFor="stock-create-name" className="space-y-1">
                <span className="block text-xs font-semibold uppercase text-neutral-500">
                  Nombre
                </span>
                <input
                  id="stock-create-name"
                  type="text"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
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
                  className="w-full px-3 py-2"
                  placeholder="Codigo o referencia"
                />
              </label>

              <label htmlFor="stock-create-quantity" className="space-y-1">
                <span className="block text-xs font-semibold uppercase text-neutral-500">
                  Cantidad
                </span>
                <input
                  id="stock-create-quantity"
                  type="number"
                  min="0"
                  value={createQuantity}
                  onChange={(event) => setCreateQuantity(Number(event.target.value || 0))}
                  className="w-full px-3 py-2"
                  disabled={createType === 'family' || createType === 'product'}
                />
              </label>

              <label htmlFor="stock-create-family" className="space-y-1">
                <span className="block text-xs font-semibold uppercase text-neutral-500">
                  Familia
                </span>
                <select
                  id="stock-create-family"
                  value={createFamilyId}
                  onChange={(event) => {
                    setCreateFamilyId(event.target.value);
                    const family = families.find((item) => idsMatch(item.id, event.target.value));
                    setCreateProductId(family?.products[0]?.id ?? '');
                    setCreateArticleId(family?.products[0]?.articles[0]?.id ?? '');
                  }}
                  className="w-full px-3 py-2"
                  disabled={createType === 'family'}
                >
                  <option value="">Selecciona una familia</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}
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
                  onChange={(event) => {
                    setCreateProductId(event.target.value);
                    const product = families
                      .find((family) => idsMatch(family.id, createFamilyId))
                      ?.products.find((item) => idsMatch(item.id, event.target.value));
                    setCreateArticleId(product?.articles[0]?.id ?? '');
                  }}
                  className="w-full px-3 py-2"
                  disabled={createType === 'family' || createType === 'product'}
                >
                  <option value="">Selecciona un producto</option>
                  {families
                    .find((family) => idsMatch(family.id, createFamilyId))
                    ?.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                </select>
              </label>

              <label htmlFor="stock-create-article" className="space-y-1">
                <span className="block text-xs font-semibold uppercase text-neutral-500">
                  Artículo
                </span>
                <select
                  id="stock-create-article"
                  value={createArticleId}
                  onChange={(event) => setCreateArticleId(event.target.value)}
                  className="w-full px-3 py-2"
                  disabled={
                    createType === 'family' || createType === 'product' || createType === 'article'
                  }
                >
                  <option value="">Selecciona un artículo</option>
                  {families
                    .find((family) => idsMatch(family.id, createFamilyId))
                    ?.products.find((product) => idsMatch(product.id, createProductId))
                    ?.articles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className="flex items-end justify-end md:col-span-2 xl:col-span-4">
                <button type="submit" className="px-4 py-2 font-semibold bg-primary text-white">
                  Crear
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Stock;
