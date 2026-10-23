-- Цель заявки бывает только из каталога. Заявки, созданные раньше с целью
-- свободным текстом, получают основную цель своего продукта: она совпадает с его id.
update applications
set purpose = product_id
where purpose not in ('working_capital', 'cash_gap', 'equipment', 'development');
