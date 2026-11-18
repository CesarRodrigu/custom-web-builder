-- Smoke dataset: two categories and five products, mirrored by POST /seed/smoke
-- (SeedController). Every statement is idempotent, so the script can run on every
-- application start without duplicating rows created through the REST endpoint.

INSERT INTO categories (name)
VALUES ('Electrónica'),
       ('Informática') ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, sku, price, sale_price, stock_quantity,
                      brand, image_url, active, created_at, updated_at)
VALUES ('iPhone 16', 'Smartphone Apple con pantalla OLED de 6,1 pulgadas', 'ELEC-001',
        899.00, 849.00, 25, 'Apple', 'https://placehold.co/600x600?text=iPhone+16', true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('Samsung Galaxy S25', 'Smartphone Android de gama alta', 'ELEC-002',
        959.00, NULL, 18, 'Samsung', 'https://placehold.co/600x600?text=Galaxy+S25', true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('MacBook Air M4', 'Portátil ligero para trabajo y estudio', 'ELEC-003',
        1199.00, 1099.00, 12, 'Apple', 'https://placehold.co/600x600?text=MacBook+Air', true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('Monitor Dell UltraSharp 27', 'Monitor de 27 pulgadas para trabajo profesional', 'MON-001',
        449.00, NULL, 8, 'Dell', 'https://placehold.co/600x600?text=Dell+Monitor', true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('Teclado Keychron K2', 'Teclado mecánico compacto inalámbrico', 'ACC-002',
        89.99, 79.99, 20, 'Keychron', 'https://placehold.co/600x600?text=Keychron+K2', true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

-- The image gallery of each smoke product mirrors its main image, so the
-- collection table is populated whether the data is loaded at startup or
-- through POST /seed/smoke.
INSERT INTO product_image_urls (product_id, image_url)
SELECT p.id, p.image_url
FROM products p
WHERE p.image_url IS NOT NULL
  AND NOT EXISTS (SELECT 1
                  FROM product_image_urls piv
                  WHERE piv.product_id = p.id);

-- Categories are linked by natural key, so the statement also repairs products
-- that already existed (for example, the ones inserted by POST /product/createall).
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM (VALUES ('ELEC-001', 'Electrónica'),
             ('ELEC-002', 'Electrónica'),
             ('ELEC-003', 'Informática'),
             ('MON-001', 'Informática'),
             ('ACC-002', 'Informática')) AS seed(sku, category_name)
         JOIN products p ON p.sku = seed.sku
         JOIN categories c ON c.name = seed.category_name
WHERE NOT EXISTS (SELECT 1
                  FROM product_categories pc
                  WHERE pc.product_id = p.id
                    AND pc.category_id = c.id);
