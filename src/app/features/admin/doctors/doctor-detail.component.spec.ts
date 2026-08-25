import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import type { AdminDoctor } from '../../../core/models';
import { DoctorDetailComponent } from './doctor-detail.component';

const DOCTOR_ID = 'doctor-uuid-1';
const DOCTOR_URL = `http://localhost:8080/api/doctors/${DOCTOR_ID}`;

function doctor(): AdminDoctor {
  return {
    uuid: DOCTOR_ID,
    email: 'doc@test.com',
    firstName: 'Carlos',
    lastName: 'Perez',
    speciality: 'Cardiología',
    gender: 'GENDER_MALE',
    ci: '0102030405',
  };
}

type Fixture = ReturnType<typeof TestBed.createComponent<DoctorDetailComponent>>;

describe('DoctorDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: DOCTOR_ID }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function create(): Fixture {
    const fixture = TestBed.createComponent(DoctorDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne(DOCTOR_URL).flush(doctor());
    fixture.detectChanges();
    return fixture;
  }

  it('deletes the doctor and navigates back to the list on success', () => {
    const fixture = create();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    fixture.componentInstance.openDeleteModal();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Eliminar Doctor');

    fixture.componentInstance.confirmDelete();
    httpMock.expectOne({ url: DOCTOR_URL, method: 'DELETE' }).flush(null);
    fixture.detectChanges();

    expect(alertSpy).toHaveBeenCalledWith('Doctor eliminado correctamente.');
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/administracion/doctores']);
  });

  /**
   * The point of this task: the backend now blocks deletion with a specific
   * reason (booked turns) — the UI must surface THAT message, not a generic
   * "Error al eliminar" that hides the actionable reason from the operator.
   */
  it('surfaces the backend\'s specific rejection reason when delete is blocked', () => {
    const fixture = create();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    const backendMessage =
      'No se puede eliminar el doctor porque tiene turnos reservados asociados a sus horarios. Cancele o reasigne los turnos antes de eliminarlo.';

    fixture.componentInstance.openDeleteModal();
    fixture.componentInstance.confirmDelete();
    httpMock
      .expectOne({ url: DOCTOR_URL, method: 'DELETE' })
      .flush({ message: backendMessage }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(alertSpy).toHaveBeenCalledWith(backendMessage);
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
