export interface SortableOptions {
  container: HTMLElement;
  itemSelector: string;
  draggingClassName?: string;
  onReorder?: (items: HTMLElement[]) => void;
}

export interface SortableController {
  destroy: () => void;
}

const closestItem = (target: EventTarget | null, selector: string): HTMLElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }
  return target.closest(selector) as HTMLElement | null;
};

const listItems = (container: HTMLElement, selector: string): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(selector));

export const createSortable = ({
  container,
  itemSelector,
  draggingClassName = 'widget-block--dragging',
  onReorder,
}: SortableOptions): SortableController => {
  let draggingElement: HTMLElement | null = null;
  let isFinalised = false;

  const finaliseDrag = () => {
    if (!draggingElement || isFinalised) {
      return;
    }

    draggingElement.classList.remove(draggingClassName);
    const ordered = listItems(container, itemSelector);
    onReorder?.(ordered);

    draggingElement = null;
    isFinalised = true;
  };

  const handleDragStart = (event: DragEvent) => {
    const target = closestItem(event.target, itemSelector);
    if (!target) {
      return;
    }

    draggingElement = target;
    isFinalised = false;
    target.classList.add(draggingClassName);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', target.dataset.widgetId ?? target.id ?? '');
    }
  };

  const handleDragOver = (event: DragEvent) => {
    if (!draggingElement) {
      return;
    }

    const target = closestItem(event.target, itemSelector);
    const { dataTransfer } = event;

    if (dataTransfer) {
      dataTransfer.dropEffect = 'move';
    }

    if (!target) {
      event.preventDefault();
      const items = listItems(container, itemSelector);
      const last = items.at(-1);
      if (last && last !== draggingElement && last.nextSibling !== draggingElement) {
        last.after(draggingElement);
      } else if (!last && draggingElement.parentElement !== container) {
        container.appendChild(draggingElement);
      }
      return;
    }

    if (target === draggingElement) {
      event.preventDefault();
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const isAfter = event.clientY > targetRect.top + targetRect.height / 2;

    event.preventDefault();

    if (isAfter) {
      if (target.nextSibling !== draggingElement) {
        target.after(draggingElement);
      }
    } else if (target !== draggingElement.nextSibling) {
      target.before(draggingElement);
    }
  };

  const handleDrop = (event: DragEvent) => {
    if (!draggingElement) {
      return;
    }

    event.preventDefault();
    finaliseDrag();
  };

  const handleDragEnd = () => {
    finaliseDrag();
  };

  container.addEventListener('dragstart', handleDragStart, true);
  container.addEventListener('dragover', handleDragOver, true);
  container.addEventListener('drop', handleDrop, true);
  container.addEventListener('dragend', handleDragEnd, true);

  const destroy = () => {
    container.removeEventListener('dragstart', handleDragStart, true);
    container.removeEventListener('dragover', handleDragOver, true);
    container.removeEventListener('drop', handleDrop, true);
    container.removeEventListener('dragend', handleDragEnd, true);
  };

  return { destroy };
};

export default createSortable;
